from __future__ import annotations
import re
import json
from collections import defaultdict
from typing import Any, Dict, Type, Callable, Optional, Sequence, Union, List
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from .context import ProjectContext
from .config import Config
from .tools import register_tools
from .db_manager import DBManager
from .prompt import AI_AGENT_PROMPT, ANALYSE_BEHAVIOR_PROMPT
from threading import Lock
from .log import logger
from pydantic import PrivateAttr
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import BaseTool
from langchain_core.messages.base import BaseMessage

ToolLike = Union[BaseTool, Dict[str, Any], Type[Any], Callable[..., Any]]

_RE_RETRY_AFTER = re.compile(r"retry[_ ]delay\s*\{\s*seconds:\s*(\d+)", re.IGNORECASE)
_RE_429 = re.compile(r"\b(429|RESOURCE_EXHAUSTED)\b", re.IGNORECASE)

class RotatingGeminiModel(BaseChatModel):
    _api_keys: List[str] = PrivateAttr()
    _current_key_index: int = PrivateAttr()
    _model_name: str = PrivateAttr()
    _temperature: float = PrivateAttr()
    _base_kwargs: Dict[str, Any] = PrivateAttr()
    _bound_tools: Optional[Sequence[ToolLike]] = PrivateAttr(default=None)
    _bound_kwargs: Dict[str, Any] = PrivateAttr(default_factory=dict)

    def __init__(
        self,
        api_keys: Sequence[str],
        model_name: str = "gemini-2.5-flash",
        temperature: float = 0.3,
        **kwargs: Any,
    ):
        super().__init__()
        self._api_keys = list(api_keys)
        if not self._api_keys:
            raise ValueError("At least one API key is required.")
        self._current_key_index = 0
        self._model_name = model_name
        self._temperature = temperature
        # Force minimal retries at underlying layer to avoid waiting on 429
        self._base_kwargs = {"max_retries": 0, **(kwargs or {})}
        self._bound_tools = None
        self._bound_kwargs = {}

    @property
    def _llm_type(self) -> str:
        return "rotating-gemini-chat"

    def _build_llm_for_index(self, idx: int) -> ChatGoogleGenerativeAI:
        llm = ChatGoogleGenerativeAI(
            model=self._model_name,
            google_api_key=self._api_keys[idx],
            temperature=self._temperature,
            **self._base_kwargs,
        )
        if self._bound_tools is not None:
            llm = llm.bind_tools(self._bound_tools, **self._bound_kwargs)
        return llm

    def _extract_retry_after(self, e: Exception) -> Optional[int]:
        m = _RE_RETRY_AFTER.search(str(e))
        if m:
            try:
                return int(m.group(1))
            except Exception:
                return None
        return None

    def _is_429(self, e: Exception) -> bool:
        return bool(_RE_429.search(str(e)))

    def _should_rotate(self, exc: Exception) -> bool:
        # Instant rotate on 429; do not rotate on 400/403/404/invalid config
        msg = str(exc)
        if self._is_429(exc):
            return True
        fatal = ["400", "INVALID_ARGUMENT", "FAILED_PRECONDITION", "403", "PERMISSION_DENIED", "404", "NOT_FOUND"]
        if any(tok in msg for tok in fatal):
            return False
        # For other transient server errors, allow rotation
        transient = ["503", "UNAVAILABLE", "500", "INTERNAL", "504", "DEADLINE_EXCEEDED"]
        if any(tok in msg for tok in transient):
            return True
        # Default: do not rotate
        return False

    def _next_index(self) -> int:
        self._current_key_index = (self._current_key_index + 1) % len(self._api_keys)
        return self._current_key_index

    def _generate(self, messages: List[BaseMessage], stop: Optional[Sequence[str]] = None, run_manager: Optional[Any] = None, **kwargs: Any) -> ChatResult:
        attempts = len(self._api_keys)
        idx = self._current_key_index
        last_exc = None

        for attempt in range(attempts):
            try:
                logger.info(f"🧩 Using Google API key #{idx + 1}")
                llm = self._build_llm_for_index(idx)
                ai_msg: BaseMessage = llm.invoke(messages, **({} if stop is None else {"stop": stop}), **kwargs)
                return ChatResult(generations=[ChatGeneration(message=ai_msg)])
            except Exception as e:
                last_exc = e
                if self._is_429(e):
                    ra = self._extract_retry_after(e)
                    logger.warning(f"⚠️ 429 quota hit on key #{idx + 1}{' (retry_after='+str(ra)+'s)' if ra is not None else ''}; switching keys immediately.")
                else:
                    logger.error(f"Model error on key #{idx + 1}: {e}")

                if attempt == attempts - 1 or not self._should_rotate(e):
                    break

                idx = self._next_index()
                logger.warning(f"🔄 Switching to Google API key #{idx + 1}")

        raise RuntimeError("All Gemini API keys exhausted or invalid.") from last_exc

    def invoke(self, input: Any, config: Optional[dict] = None, **kwargs: Any) -> BaseMessage:
        attempts = len(self._api_keys)
        idx = self._current_key_index
        last_exc = None

        for attempt in range(attempts):
            try:
                logger.info(f"🧩 Using Google API key #{idx + 1}")
                llm = self._build_llm_for_index(idx)
                return llm.invoke(input, config=config, **kwargs)
            except Exception as e:
                last_exc = e
                if self._is_429(e):
                    ra = self._extract_retry_after(e)
                    logger.warning(f"⚠️ 429 quota hit on key #{idx + 1}{' (retry_after='+str(ra)+'s)' if ra is not None else ''}; switching keys immediately.")
                else:
                    logger.error(f"Model error on key #{idx + 1}: {e}")

                if attempt == attempts - 1 or not self._should_rotate(e):
                    break

                idx = self._next_index()
                logger.warning(f"🔄 Switching to Google API key #{idx + 1}")

        raise RuntimeError("All Gemini API keys exhausted or invalid.") from last_exc

    def stream(self, input: Any, config: Optional[dict] = None, **kwargs: Any):
        attempts = len(self._api_keys)
        idx = self._current_key_index
        last_exc = None

        for attempt in range(attempts):
            try:
                logger.info(f"🧩 (stream) Using Google API key #{idx + 1}")
                llm = self._build_llm_for_index(idx)
                yield from llm.stream(input, config=config, **kwargs)
                return
            except Exception as e:
                last_exc = e
                if self._is_429(e):
                    ra = self._extract_retry_after(e)
                    logger.warning(f"⚠️ (stream) 429 quota hit on key #{idx + 1}{' (retry_after='+str(ra)+'s)' if ra is not None else ''}; switching keys immediately.")
                else:
                    logger.error(f"(stream) Model error on key #{idx + 1}: {e}")

                if attempt == attempts - 1 or not self._should_rotate(e):
                    break

                idx = self._next_index()
                logger.warning(f"🔄 (stream) Switching to Google API key #{idx + 1}")

        raise RuntimeError("All Gemini API keys exhausted or invalid.") from last_exc

    def bind_tools(self, tools: Sequence[ToolLike], **kwargs: Any) -> "RotatingGeminiModel":
        clone = RotatingGeminiModel(
            api_keys=self._api_keys,
            model_name=self._model_name,
            temperature=self._temperature,
            **self._base_kwargs,
        )
        clone._current_key_index = self._current_key_index
        clone._bound_tools = list(tools) if tools is not None else None
        clone._bound_kwargs = dict(kwargs or {})
        return clone

    
class EnquiryAI:
    def __init__(self,db_manager=None):
        if db_manager is not None:
            self.db_manager = db_manager
        else:
            self.db_manager = DBManager()
        self.users: Dict[str, Dict[str, Any]] = {}
        self.config = Config()
        self._user_locks = defaultdict(Lock)
        self.user_role = "general user" 
        self.engine = None
        self.collection = "Slide_Embeddings"
        self.session_memories = "recall_memories"
        self.vector_store = None
        self.recall_vector_store = None
        self.tools = []
        self.agent = None
        self.top_tech: list[str] = []
        self.top_domain: list[str] = []

        self.tone = None
        self.verbosity = None
        self.recent_queries = None
        self.project_content = ProjectContext()
        self._async_initialized = False
        self.model = RotatingGeminiModel(
            api_keys=[
                self.config.GOOGLE_API_KEY_1,
                self.config.GOOGLE_API_KEY_2,
                self.config.GOOGLE_API_KEY_3,
                self.config.GOOGLE_API_KEY_4,
                self.config.GOOGLE_API_KEY_5,
                self.config.GOOGLE_API_KEY_6,
                self.config.GOOGLE_API_KEY_7,
                self.config.GOOGLE_API_KEY_8,
                self.config.GOOGLE_API_KEY_9,
                self.config.GOOGLE_API_KEY_10,

            ],
            model_name="gemini-2.5-flash",
            temperature=0.3,
            max_output_tokens=2000,  
        )



 
    def _create_profile(self,role: str = None):
        """Create default user profile."""
        logger.info("Creating new user profile.")
        if role is None:
            role = self.config.DEFAULT_USER_ROLE
        
        return {
            "role":role,
            "tone_score": {"neutral": 0.22, "formal": 0.22, "casual": 0.22},
            "verbosity_score": {"brief": 0.22, "detailed": 0.22, "neutral": 0.22},
            "technology_interest": {},
            "domain_interest": {},
            "recent_query": []
        }


    def _clean_and_parse_json_async(self, raw_text: str) -> dict:
        """
        Cleans and parses model outputs into valid JSON.
        Handles fenced code blocks, stray characters, and malformed JSON gracefully.
        """
        try:
            logger.info("Cleaning and parsing JSON response.")
            # Remove markdown fences and language tags
            cleaned = re.sub(r"^```[a-zA-Z0-9]*\s*", "", raw_text.strip())
            cleaned = re.sub(r"```$", "", cleaned).strip()

            # Extract JSON if embedded in text
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(0).strip()

            # Try parsing
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                logger.warning("⚠️ JSON malformed, attempting lightweight repair.")

            # Lightweight repair: single quotes → double, remove trailing commas, strip backslashes
            fixed = cleaned.replace("'", '"')
            fixed = re.sub(r",(\s*[}\]])", r"\1", fixed)  # remove trailing commas
            fixed = fixed.replace("\\n", "")   # remove escaped newlines
            fixed = re.sub(r"(?<=\w)\\(?=\w)", "", fixed)  # stray backslashes

            try:
                return json.loads(fixed)
            except json.JSONDecodeError:
                logger.warning("⚠️ Still invalid after regex fix; trying AI repair.")

            logger.error("❌ JSON parsing failed completely.")
            return {}

        except Exception as e:
            logger.error(f"Error cleaning JSON: {e}")
            return {}

    def _analyze_text_features(self, query: str) -> dict:
        """
        Extract technologies, domains, tone, and verbosity in a single non-blocking LLM call.
        
        """
        logger.info(f"🔄 Analyzing text features for query: {query}")
        try:
            example_json = """
                            {{
                                "technologies": ["Python", "PostgreSQL"],
                                "domains": ["technology"],
                                "intent": "problem_solving",
                                "tone": "neutral",
                                "verbosity": "detailed"
                                
                            }}
                            """
            prompt_text = ANALYSE_BEHAVIOR_PROMPT.format(query=query,example_json=json.dumps(example_json, indent=4))
            prompt = ChatPromptTemplate.from_messages([
                (
                    "system",
                    "You are a hyper-analytical AI engine specializing in deep linguistic and technical feature extraction. Your purpose is to deconstruct a user query into a structured JSON object based on a rigorous set of rules."
                ),
                (
                    "human",prompt_text
                   
                )
            ])

            chain = prompt | self.model
            response = chain.invoke({"query": query})
            parsed = self._clean_and_parse_json_async(response.content)
            if isinstance(parsed, dict):
                parsed["technologies"] = [t.lower() for t in parsed.get("technologies", []) if t]
                parsed["domains"] = [d.lower() for d in parsed.get("domains", []) if d]
                parsed["tone"] = parsed.get("tone", "neutral").lower()
                parsed["verbosity"] = parsed.get("verbosity", "neutral").lower()
                logger.info(f"✅ Extracted features: {parsed}")
            else:
                parsed = {"technologies": [], "domains": [], "tone": "neutral", "verbosity": "neutral"}
                logger.warning("⚠️ Parsed features not a dict; defaulting to neutral/empty.")
            logger.info(f"✅ Extracted features: {parsed}")
            return parsed
        except Exception as e:
            logger.error(f"Text feature analysis failed: {e}")
            return {"technologies": [], "domains": [], "tone": "neutral", "verbosity": "neutral"}
        
    def _resolve_tone(self, query, llm_tone, scores, threshold=None):
        """Resolve final tone based on query content and scores."""
        logger.info("Resolving final tone.")
        threshold = threshold or self.config.TONE_THRESHOLD
        query_lower = query.lower()
        if "formal" in query_lower:
            return "formal", True
        elif "casual" in query_lower:
            return "casual", True
        elif "neutral" in query_lower:
            return "neutral", True
        if all(v == 0 for v in scores.values()):
            return "neutral", False          
        best = max(scores, key=scores.get)
        sorted_scores = sorted(scores.values())
        score_diff = scores[best] - (sorted_scores[-2] if len(sorted_scores) > 1 else 0)      
        logger.debug(f"Tone resolution: best={best}, llm_tone={llm_tone}, score_diff={score_diff:.3f}, threshold={threshold}")
        if score_diff >= threshold:
            logger.debug(f"Chose tone '{best}' based on scores.")
            return best, False
        else:
            logger.debug(f"Chose tone '{llm_tone}' from LLM due to close scores.")
            return llm_tone if llm_tone != "neutral" else best, False
        
    def _resolve_verbosity(self, query, llm_verbosity, scores, threshold=None):
        """Resolve final verbosity based on query content and scores."""
        logger.info("Resolving final verbosity.")
        threshold = threshold or self.config.VERBOSITY_THRESHOLD
        query_lower = query.lower()
        
        # Check for explicit verbosity indicators
        if "brief" in query_lower or "short" in query_lower:
            return "brief", True
        elif "detailed" in query_lower or "long" in query_lower:
            return "detailed", True
        elif "neutral" in query_lower:
            return "neutral", True
            
        # Use historical scores
        if all(v == 0 for v in scores.values()):
            return "neutral", False
            
        best = max(scores, key=scores.get)
        sorted_scores = sorted(scores.values())
        score_diff = scores[best] - (sorted_scores[-2] if len(sorted_scores) > 1 else 0)
        logger.debug(f"Verbosity resolution: best={best}, llm_verbosity={llm_verbosity}, score_diff={score_diff:.3f}, threshold={threshold}")
        if score_diff >= threshold:
            return best, False
        else:
            logger.debug(f"Chose verbosity '{llm_verbosity}' from LLM due to close scores.")
            return llm_verbosity if llm_verbosity != "neutral" else best, False

    def _update_scores(self, scores, chosen, increment, decay, explicit=False):
        """Update scoring system for tone/verbosity."""
        logger.info(f"Updating scores: chosen={chosen}, explicit={explicit}")
        for k in scores:
            scores[k] *= decay
        boost = increment * 2 if explicit else increment
        scores[chosen] += boost
        logger.debug(f"Updated scores: {scores}")

    def _prune_interests(self, profile):
        """Prune interests to keep within limits."""
        logger.info("Pruning interests to maintain size limits.")
        for interest_type in ["technology_interest", "domain_interest"]:
            interests = profile[interest_type]
            if len(interests) > self.config.MAX_INTEREST_ITEMS:
                top_items = dict(
                    sorted(interests.items(), key=lambda x: x[1], reverse=True)[:self.config.MAX_INTEREST_ITEMS]
                )
                profile[interest_type] = top_items
        logger.debug(f"Pruned interests: {profile['technology_interest']}, {profile['domain_interest']}")

    def _update_interest_scores(self, profile, extracted):
        """Update interest scores based on extracted keywords."""
        logger.info("Updating interest scores.")
        # Apply decay to existing interests
        for k in profile["technology_interest"]:
            profile["technology_interest"][k] *= self.config.INTEREST_DECAY
        for k in profile["domain_interest"]:
            profile["domain_interest"][k] *= self.config.INTEREST_DECAY
        logger.debug(f"Decayed interests: {profile['technology_interest']}, {profile['domain_interest']}")  
        # Add new interests
        for tech in extracted["technologies"]:
            profile["technology_interest"][tech] = profile["technology_interest"].get(tech, 0) + self.config.INTEREST_INCREMENT
        for dom in extracted["domains"]:
            profile["domain_interest"][dom] = profile["domain_interest"].get(dom, 0) + self.config.INTEREST_INCREMENT
            
        self._prune_interests(profile)
        logger.debug(f"Updated interests: {profile['technology_interest']}, {profile['domain_interest']}")  

    def analyze_and_update_background(self, user_id: str, query: str, callback=None):
        """
        Analyze user query and update profile in the background (synchronously now).
        
        """
        logger.info(f"Starting background analysis for user {user_id}.")
        try:
            logger.info(f"🔄 Background analysis for user {user_id} with query: {query}")
            with self._user_locks[user_id]:  # if using locks, make them sync locks
                if user_id not in self.users:
                    self.users[user_id] = self._create_profile(user_id)
                profile = self.users[user_id]
                profile["recent_query"].append(query)
                if len(profile["recent_query"]) > self.config.MAX_RECENT_QUERIES:
                    profile["recent_query"].pop(0)
                
                # Sync version of feature extraction
                features = self._analyze_text_features(query)  # not async
                classification = {"tone": features["tone"], "verbosity": features["verbosity"]}
                extracted = {"technologies": features["technologies"], "domains": features["domains"]}

                # Update scores
                tone, tone_explicit = self._resolve_tone(
                    query, classification.get("tone", "neutral"), profile["tone_score"]
                )
                verbosity, verb_explicit = self._resolve_verbosity(
                    query, classification.get("verbosity", "neutral"), profile["verbosity_score"]
                )
                self._update_scores(profile["tone_score"], tone, self.config.TONE_INCREMENT, self.config.TONE_DECAY, tone_explicit)
                self._update_scores(profile["verbosity_score"], verbosity, self.config.VERBOSITY_INCREMENT, self.config.VERBOSITY_DECAY, verb_explicit)
                self._update_interest_scores(profile, extracted)
                self.db_manager._save_profile_to_db(user_id, profile)
                profile["top_technology"] = max(profile["technology_interest"], key=profile["technology_interest"].get, default="None")
                profile["top_domain"] = max(profile["domain_interest"], key=profile["domain_interest"].get, default="None")
               
        except Exception as e:
            logger.error(f"Background analysis failed for user {user_id}: {e}")
            if callback:
                callback(user_id, None, error=e)

    

    def init_agent(self,user_id):
        """Initialize the LangGraph agent with tools."""
        logger.info(f"Initializing agent for user {user_id}.")  
        self.tools = register_tools(
            model=self.model,
            vector_store=self.vector_store,
            recall_vector_store=self.recall_vector_store,
            engine=self.engine,
            db_manager=self.db_manager
        )
        
        last_query='**No queries yet**'   
        if self.recent_queries:
            last_query=self.recent_queries[-2:]
        logger.info(f"last_query is:{last_query}")
        logger.info(f"recent queries:{self.recent_queries}")

        system_prompt=AI_AGENT_PROMPT.format(
            user_id=user_id,
            user_role=self.user_role,
            top_tech=self.top_tech or "None",
            top_domain=self.top_domain or "None",
            tone=self.tone or "neutral",
            verbosity=self.verbosity or "neutral",
            last_query=last_query,
            recent_queries=self.recent_queries or "None",
            
        )

        prompt  = ChatPromptTemplate.from_messages([
                    ("system",system_prompt),
                    ("human", "{messages}"),
                ])
        
        self.agent = create_react_agent(
            model=self.model,
            tools=self.tools,
            prompt=prompt,
            name="enquiry_ai"
        )
        logger.info(f"✅ Agent initialized for user {user_id}.")
 
