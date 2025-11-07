from typing import Dict, Any, Optional,Tuple,Union
from collections import defaultdict
from threading import Lock
from .ai_engine import EnquiryAI
from .tools import register_tools
from .db_manager import DBManager
from .config import Config
from .log import logger, set_log_filename
import json, time, os,re

logger.info("🚀 Initializing Enquiry_AI runtime...")


# Shared DB manager (initialized once)
db_manager = DBManager()
logger.info("✅ DB Manager initialized.")
_user_locks = defaultdict(Lock)

# Global runtime maps
_ai_instances: Dict[str, Dict[str, EnquiryAI]] = {}  # user_id → thread_id → EnquiryAI instance
_threads: Dict[str, Dict[str, list]] = {}           # user_id → thread_id → list of messages

logger.info("✅ Global runtime maps initialized.")

# ------------------------
# Helper Functions
# ------------------------

def _retrive_message(user_id, thread_id, role, content, file_name=None, file_path=None):
    """Retrieve messages from DB to in-memory thread (thread-safe)."""
    logger.info(f"🔄 retrieving messages for user_id={user_id}, thread_id={thread_id}, role={role}")
    with _user_locks[user_id]:
        # Ensure user/thread structure exists
        if user_id not in _threads:
            _threads[user_id] = {}
            logger.info(f"🆕 Created new user entry in threads for user_id={user_id}")
        if thread_id not in _threads[user_id]:
            _threads[user_id][thread_id] = []
            logger.info(f"🆕 Created new thread entry in threads for thread_id={thread_id} under user_id={user_id}")

        # Retrieve last N messages from DB (say last 10)
        messages = db_manager._retrieve_messages(thread_id, limit=10)

        # Clear any existing messages in memory and reload all from DB
        _threads[user_id][thread_id].clear()

        for msg in reversed(messages):  # oldest first for conversation order
            _threads[user_id][thread_id].append({
                "role": "user" if msg['direction'] == 1 else "assistant",
                "content": msg['message'],
                "file_name": msg['file_name'],
                "file_path": msg['file_path']
            })

        logger.info(f"💾 Retrieved and loaded {len(messages)} messages into memory for user={user_id}, thread={thread_id}, role={role}")

        

def _ensure_thread_and_ai_instance(user_id, thread_id, role) -> EnquiryAI:
    """Ensure AI instance and thread exist; initialize if needed."""
    global _ai_instances, _threads, db_manager
    logger.info(f"🔄 Ensuring AI instance and thread for user_id={user_id}, thread_id={thread_id}")

    _init_thread_entries(user_id, thread_id)
    _init_ai_entries(user_id)

    ai_instance = _ai_instances[user_id].get(thread_id)
    if not ai_instance:
        ai_instance = _create_new_ai_instance(user_id, thread_id, role)
    else:
        logger.info(f"✅ Retrieved existing EnquiryAI instance for user_id={user_id}, thread_id={thread_id}")

    with _user_locks[user_id]:
        _recheck_thread_entries(user_id, thread_id)
        if thread_id not in _ai_instances[user_id]:
            ai_instance = _create_new_ai_instance(user_id, thread_id, role, inside_lock=True)
        else:
            ai_instance = _ai_instances[user_id][thread_id]
    return ai_instance


# --------------------------
# 🔧 Internal Helper Functions
# --------------------------

def _init_thread_entries(user_id, thread_id):
    if user_id not in _threads:
        _threads[user_id] = {}
        logger.info(f"🆕 Created new user entry in threads for user_id={user_id}")
    if thread_id not in _threads[user_id]:
        _threads[user_id][thread_id] = []
        logger.info(f"🆕 Created new thread entry for thread_id={thread_id} under user_id={user_id}")


def _init_ai_entries(user_id):
    if user_id not in _ai_instances:
        _ai_instances[user_id] = {}
        logger.info(f"🆕 Created new user entry in AI instances for user_id={user_id}")


def _create_new_ai_instance(user_id, thread_id, role, inside_lock=False):
    ai_instance = EnquiryAI(db_manager=db_manager)
    ai_instance.engine = db_manager.engine
    ai_instance.vector_store = db_manager.vector_store
    ai_instance.recall_vector_store = db_manager.recall_vector_store

    user_role = role or Config.DEFAULT_USER_ROLE
    logger.info(f"🔄 Loading or creating profile for user_id={user_id}")

    # --- User profile loading/creation ---
    if user_id not in ai_instance.db_manager.users:
        role_from_db = ai_instance.db_manager.get_user_role(user_id)
        if role_from_db:
            user_role = role_from_db
            logger.info(f"✅ Loaded existing profile for user_id={user_id} with role={user_role}")
        else:
            ai_instance.db_manager.users[user_id] = ai_instance._create_profile(user_role)
            profile = ai_instance.db_manager.users[user_id]
            ai_instance.db_manager._save_profile_to_db(user_id, profile)
            logger.info(f"✅ Created new profile for user_id={user_id} with role={user_role}")
    else:
        _update_or_keep_existing_role(ai_instance, user_id, role, user_role)


    # --- Recent messages ---
    _load_recent_messages(ai_instance, thread_id, user_id, inside_lock)

    # --- Personalization ---
    _setup_personalization(ai_instance, user_id, user_role)

    # --- Tool registration ---
    _register_and_init(ai_instance, user_id)

    _ai_instances[user_id][thread_id] = ai_instance
    logger.info(f"✅ Created new EnquiryAI instance for user_id={user_id}, thread_id={thread_id}")
    return ai_instance


def _update_or_keep_existing_role(ai_instance, user_id, role, user_role):
    dbm = ai_instance.db_manager
    if role:
        dbm.users[user_id]["role"] = user_role
        dbm._save_profile_to_db(user_id, dbm.users[user_id])
        logger.info(f"✅ Updated role for existing profile of user_id={user_id} to role={user_role}")
    else:
        user_role = dbm.users[user_id].get("role", "general user")
        logger.info(f"✅ Using existing role for profile of user_id={user_id}: role={user_role}")
    return user_role



def _load_recent_messages(ai_instance, thread_id, user_id=None, inside_lock=False):
    try:
        if inside_lock:
            recent_msgs = ai_instance.db_manager.load_recent_messages(thread_id, limit=10, user_id=user_id)
        else:
            recent_msgs = ai_instance.db_manager.load_recent_messages(thread_id, limit=10)
        ai_instance.recent_queries = [m["content"] for m in recent_msgs if m["role"] == "user"][-3:]
        logger.info(f"✅ Loaded recent messages for user_id={user_id}, thread_id={thread_id}")
    except Exception as e:
        ai_instance.recent_queries = []
        logger.error(f"❌ Failed to load recent messages: {e}")


def _setup_personalization(ai_instance, user_id, user_role):
    profile = ai_instance.db_manager.users[user_id]
    tech = profile.get("technology_interest", {})
    domain = profile.get("domain_interest", {})
    ai_instance.top_tech = sorted(tech, key=tech.get, reverse=True)[:5] or ["None"]
    ai_instance.top_domain = sorted(domain, key=domain.get, reverse=True)[:5] or ["None"]
    ai_instance.user_role = user_role
    logger.info(f"✅ Personalization set: top_tech={ai_instance.top_tech}, top_domain={ai_instance.top_domain}, role={ai_instance.user_role}")


def _register_and_init(ai_instance, user_id):
    ai_instance.tools = register_tools(
        model=ai_instance.model,
        vector_store=ai_instance.vector_store,
        recall_vector_store=ai_instance.recall_vector_store,
        engine=ai_instance.engine,
        db_manager=db_manager
    )
    ai_instance.init_agent(user_id)


def _recheck_thread_entries(user_id, thread_id):
    """Recreate threads and instances under lock, exactly like original logic."""
    if user_id not in _threads:
        _threads[user_id] = {}
    if thread_id not in _threads[user_id]:
        _threads[user_id][thread_id] = []
    if user_id not in _ai_instances:
        _ai_instances[user_id] = {}


def extract_json_filename(ai_response: str) -> str:
    """
    Extract and replace JSON or JSON-like blocks with either:
    - The 'file_name' value (if valid JSON)
    - The raw '"file_name": ...' line (if malformed JSON)
    Handles:
    - ```json { ... }```
    - json { ... }
    - bare { ... }
    - malformed JSON with trailing commas
    - multiple blocks
    """

    pattern = r"(?:```json|json)?\s*({[^{}]*})\s*```?"
    matches = list(re.finditer(pattern, ai_response, flags=re.DOTALL | re.IGNORECASE))

    for match in reversed(matches):
        json_text = match.group(1).strip()
        replacement = ""

        try:
            # Try parsing normally
            parsed = json.loads(json_text)
            if "file_name" in parsed:
                replacement = parsed["file_name"]
        except json.JSONDecodeError:
            # Fallback: extract the "file_name" line if present
            line_match = re.search(r'["\']file_name["\']\s*:\s*["\']([^"\']+)["\']', json_text)
            if line_match:
                # Keep the original formatting line
                replacement = f'  "file_name": "{line_match.group(1)}",'

        if replacement:
            ai_response = (
                ai_response[:match.start()] + replacement + ai_response[match.end():]
            )

    return ai_response.strip()

def _build_system_context(profile, ai_instance, user_id: str) -> str:
    """Return system context string for conversation."""
    tech_interest = profile.get("technology_interest", {})
    domain_interest = profile.get("domain_interest", {})
    logger.info(f"🔄 Building system context for user_id={user_id}")
    return f"""
    User ID: {user_id}
    Role: {profile.get('role', Config.DEFAULT_USER_ROLE)}
    Recent Queries: {ai_instance.recent_queries}
    Top Technologies: {sorted(tech_interest, key=tech_interest.get, reverse=True)[:5] or ['None']}
    Top Domains: {sorted(domain_interest, key=domain_interest.get, reverse=True)[:5] or ['None']}
    """



def _stream_and_save_response(ai_instance, user_id, thread_id, messages) -> tuple[str, Optional[str], Optional[str]]:
    """Stream model response and save assistant messages to DB."""
    ai_response, ppt_path, ppt_filename = "", None, None
    logger.info(f"🔄 Streaming response for user_id :---------------------------------- ={user_id}, thread_id={thread_id},messages={messages}")
    for step in ai_instance.agent.stream({"messages": messages}, stream_mode="values"):
        last_msg = step["messages"][-1]
        raw_content = getattr(last_msg, "content", "")

        # Handle both string and list
        if isinstance(raw_content, list):
            content = " ".join(map(str, raw_content)).strip()
        else:
            content = (raw_content or "").strip()

        # Skip empty messages or "Prepared Action:" messages
        if not content or "Prepared Action:" in content:
            continue
        msg_name = getattr(last_msg, "name", "")

        if msg_name in ("generate_ppt_tool", "get_file"):
            ppt_path, ppt_filename = _process_file_message(msg_name, content)
            continue

        if type(last_msg).__name__ == "AIMessage":
            ai_response = content
    logger.info(f"before striping--->{ai_response}")
    cleaned = extract_json_filename(ai_response)
    return cleaned, ppt_path, ppt_filename

def _process_file_message(name: str, content: Union[str, dict, list, Any]) -> Tuple[Optional[str], Optional[str]]:
    """Handle messages related to file generation or retrieval."""
    ppt_path, ppt_filename = None, None

    try:
        if name == "generate_ppt_tool":
            # Direct path expected as a string
            ppt_path = str(content).strip()

        elif name == "get_file":
            # Handle dict input directly
            if isinstance(content, dict):
                ppt_path = content.get("file_path")

            # Handle list input safely
            elif isinstance(content, list):
                # Try to extract path if list contains dicts or strings
                if content and isinstance(content[0], dict):
                    ppt_path = content[0].get("file_path")
                else:
                    ppt_path = str(content[0]) if content else None

            # Handle string or JSON string input
            else:
                try:
                    parsed = json.loads(content) if isinstance(content, str) else content
                    if isinstance(parsed, dict):
                        ppt_path = parsed.get("file_path")
                    elif isinstance(parsed, list) and parsed:
                        if isinstance(parsed[0], dict):
                            ppt_path = parsed[0].get("file_path")
                        else:
                            ppt_path = str(parsed[0])
                    else:
                        ppt_path = str(parsed).strip()
                except Exception:
                    ppt_path = str(content).strip()

        # Clean up path formatting
        if ppt_path:
            ppt_path = str(ppt_path).strip().strip('"').strip('}')

        # Extract filename if path is valid
        if ppt_path:
            ppt_filename = os.path.basename(ppt_path)

    except Exception as e:
        logger.error(f"Error processing file message: {e}")
        ppt_path = f"Error: {e}"
        ppt_filename = f"Error: {e}"

    logger.info(f"ppt path------->{ppt_path}")
    logger.info(f"ppt file------->{ppt_filename}")

    return ppt_path, ppt_filename

# ------------------------
# Main RAG Function
# ------------------------
def rag(user_id: str, message: str, role: str = None, thread_id: Optional[str] = None) -> Dict[str, Any]:
    """Core RAG process for one user + one message."""
    set_log_filename(message)
    start_time = time.time()
    node_timings = {}

    logger.info(f"message received in RAG: {message}")

    # 1️⃣ Ensure AI instance exists
    ai_instance = _ensure_thread_and_ai_instance(user_id, thread_id, role)
    logger.info(f"✅ Ensured AI instance for user_id={user_id}, thread_id={thread_id},message={message}")
    # 2️⃣ Store user message
    logger.info(f"thread_id before saving message: {_threads[user_id][thread_id]}")
    _retrive_message(user_id, thread_id, "user", message)
    ai_instance.recent_queries.append(message)
    ai_instance.recent_queries = ai_instance.recent_queries[-3:]

    node_timings["setup_time"] = time.time() - start_time

    # 3️⃣ Build conversation messages
    profile = ai_instance.db_manager.users[user_id]
    thread_messages = _threads[user_id][thread_id]
    logger.info(f"thread_messages-----------{thread_messages}")
    system_context = _build_system_context(profile, ai_instance, user_id)
    logger.info(f"system_context={system_context}")
    logger.info(f"✅ Built system context for user_id={user_id}")

    messages = [{"role": "system", "content": f"Dynamic context:\n{system_context}"},*thread_messages]
    logger.info(f"messages={messages}")

    # 4️⃣ Stream model response and save assistant message
    ai_response, ppt_path, ppt_filename = _stream_and_save_response(ai_instance, user_id, thread_id, messages)

    # 5️⃣ Background profile update
    ai_instance.analyze_and_update_background(user_id, message)
    logger.info(f"ai_response:{ai_response}")
    node_timings["total_time"] = time.time() - start_time
    logger.info(f"message processed in RAG: {message}")
    logger.info(f"✅ Completed RAG process for user_id={user_id}, thread_id={thread_id},message={message}, in {node_timings['total_time']:.2f}s")


    return {
        "thread_id": thread_id,
        "response": {
            "message": ai_response,
            "file_name": ppt_filename,
            "file_path": ppt_path
        },
      
        "role": str(profile.get("role", Config.DEFAULT_USER_ROLE)),
        "node_timings": node_timings
    }
