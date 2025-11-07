import uuid
import json
import re
from typing import List
from langchain_core.tools import tool
from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage
from sqlalchemy import text
from .schemas import SQLQueryInput, ProjectSearchInput, NLQueryInput
from .context import ProjectContext
from .ppt_generation_agent import init_ppt_service, generate_ppt_tool
from .db_manager import DBManager
from .prompt import SQL_SCHEMA, SQL_AGENT_PROMPT
from .log import logger

MIN_TOKEN_LEN = 3
CANDIDATE_LIMIT = 25
LLM_MIN_CONFIDENCE = 0.6
# -------------------- Agent Tools --------------------
class AgentTools:
    def __init__(self, model, vector_store=None, recall_vector_store=None, engine=None, project_content=None,db_manager=None):
        

        self.db_manager = db_manager or DBManager()
        self.model = model
        self.vector_store = vector_store or self.db_manager.vector_store
        self.recall_vector_store = recall_vector_store or self.db_manager.recall_vector_store
        self.users = self.db_manager.users
        self.engine = engine
        self.project_content = project_content
        init_ppt_service(self.engine)     
    # Memory tools
    def save_recall_memory(self, memory: str, user_id: str):
        """Save memory to vectorstore for later semantic retrieval."""
        try:
            logger.info(f"Saving memory for user {user_id}: {memory}")

            if not self.recall_vector_store:
                return "Error: Recall vector store not initialized"

            doc = Document(
                    page_content=memory,
                    id=f"{user_id}-{uuid.uuid4()}",  
                    metadata={"user_id": user_id}
                )
            self.recall_vector_store.add_documents([doc])
            return f"Memory saved: {memory}"
        except Exception as e:
            return f"Error saving memory: {e}"

    def search_recall_memories(self, query: str, user_id: str) -> List[str]:
        """Search saved memories with reranking."""
        try:
            logger.info(f"Searching memories for user {user_id} with query: {query}")
            if not self.recall_vector_store:
                return ["Error: Recall vector store not initialized"]

            docs = self.recall_vector_store.similarity_search(query, k=20, filter={"user_id": {"$eq": user_id}})
            if not docs:
                return ["No matching memories found."]

            candidates = [d.page_content for d in docs]

            rerank_prompt = f"""
                You are a reranker for a memory retrieval system.
                Query: {query}

                Candidate memories:
                {chr(10).join(f"{i+1}. {c}" for i, c in enumerate(candidates))}

                Return the top 5 most relevant memories as a JSON array of strings, ordered by relevance.
                """

            response = self.model.invoke([
                SystemMessage(content="You are a helpful assistant that ranks relevant memories."),
                HumanMessage(content=rerank_prompt)
            ])

            try:
                ranked = json.loads(response.content)
                if isinstance(ranked, list) and all(isinstance(x, str) for x in ranked):
                    return ranked[:5]
            except Exception:
                ranked = [r.lstrip("1234567890. ").strip() for r in response.content.split("\n") if r.strip()]
                return ranked[:5]

            return ["No valid reranked memories returned."]
        except Exception as e:
           
            return [f"Error searching memories: {e}"]

    # Slide tool
    def search_slides(self, query: str) -> List[str]:
        """Search for relevant slides content."""
        try:
            logger.info(f"Searching slides with query: {query}")
            if not self.vector_store:
                return ["Error: Vector store not initialized"]

            cleaned_query = query
            retriever = self.vector_store.as_retriever(search_type="mmr", search_kwargs={"k": 5, "fetch_k": 30})
            docs = retriever.invoke(cleaned_query)
          
            return [d.page_content for d in docs] if docs else ["No matching slides found."]
        except Exception as e:
          
            return [f"Error searching slides: {e}"]

    # SQL tools
    def execute_sql_query(self, sql: str, reasoning: str) -> str:
        """Execute SQL using SQLAlchemy and return results."""
        try:
            logger.info(f"Executing SQL: {sql} with reasoning: {reasoning}")
            with self.engine.begin() as conn:
                result = conn.execute(text(sql))
                rows = [dict(row._mapping) for row in result]
                if rows and "id" in rows[0]:
                    self.project_content.update_project_id(rows[0]["id"])
               
            return json.dumps(rows, default=str, indent=2) if rows else "[]"
        except Exception as e:
            return f"Error executing SQL: {e}"

        
    @staticmethod
    def _normalize(s: str) -> str:
        s = s or ""
        s = s.strip()
        return re.sub(r"\s+", " ", s)

    @staticmethod
    def _build_llm_prompt(query: str, candidates: list[dict]) -> str:
        items = []
        for i, c in enumerate(candidates):
            items.append({
                "index": i,
                "name": c.get("name") or c.get("project_name") or "",
                "description": (c.get("description") or "")[:300],
            })
        return (
            "You are a reranker that selects the single most relevant project to the user's request.\n"
            "Rules:\n"
            "- Consider exactness of meaning, not just token overlap.\n"
            "- Prefer matches that capture full intent of the query.\n"
            "- Output JSON only, no prose, matching this schema:\n"
            '{ "index": <int>, "confidence": <float between 0 and 1>, "reason": "<short string>" }\n\n'
            f"Query: {query}\n"
            f"Candidates (index, name, description):\n{json.dumps(items, ensure_ascii=False)}\n\n"
            "Return ONLY the JSON object."
        )

    def get_project_file(self, project_name: str) -> str:
        """
        Retrieve the file path (download URL) for a project document (RFP/Case Study) by project name.
        """
        q = AgentTools._normalize(project_name)  # static call
        logger.info(f"Executing get project file tool")
        if not q:
            return json.dumps({"project_name": None, "file_path": None}, default=str, indent=2)

        try:
            with self.engine.begin() as conn:
                # 1) Case-insensitive exact match fast path
                exact = conn.execute(
                    text("""
                        SELECT p.name AS project_name, d.file_path
                        FROM project p
                        JOIN document d ON d.project_id = p.id
                        WHERE LOWER(p.name) = LOWER(:pname)
                        ORDER BY d.id ASC
                        LIMIT 1
                    """),
                    {"pname": q}
                ).fetchone()
                if exact:
                    m = exact._mapping
                    return json.dumps({"project_name": m["project_name"], "file_path": m["file_path"]}, default=str, indent=2)

                # 2) Candidate harvest with tokenized ILIKE
                tokens = [t for t in q.split() if len(t) >= MIN_TOKEN_LEN]
                if not tokens:
                    return json.dumps({"project_name": None, "file_path": None}, default=str, indent=2)

                ilike = " OR ".join([f"p.name ILIKE :t{i}" for i in range(len(tokens))])
                params = {f"t{i}": f"%{tok}%" for i, tok in enumerate(tokens)}

                # Pull name + description; choose one document/file_path to return
                rows = conn.execute(
                    text("""
                        SELECT 
                            p.id, p.name, p.description, d.file_path, similarity(p.name, :name) AS sim
                        FROM project p
                        LEFT JOIN LATERAL (
                            SELECT file_path
                            FROM document d
                            WHERE d.project_id = p.id
                            ORDER BY d.id ASC
                            LIMIT 1
                        ) d ON TRUE
                        WHERE p.name ILIKE :pattern
                        OR similarity(p.name, :name) > 0.2
                        ORDER BY sim DESC
                        LIMIT :limit
                    """),
                    {"name": q, "pattern": f"%{q}%", "limit": CANDIDATE_LIMIT}
                ).fetchall()

            candidates = [
                {
                    "id": r._mapping["id"],
                    "name": r._mapping["name"],
                    "description": r._mapping.get("description") or "",
                    "file_path": r._mapping.get("file_path"),
                }
                for r in rows
            ]

            if not candidates:
                return json.dumps({"project_name": None, "file_path": None}, default=str, indent=2)

            # 3) LLM rerank
            prompt = AgentTools._build_llm_prompt(q, candidates)  # static call
            resp = self.model.invoke([  # LangChain-compatible call
                SystemMessage(content="You are a strict JSON-only reranker."),
                HumanMessage(content=prompt),
            ])
            try:
                out = json.loads(getattr(resp, "content", str(resp)))
            except Exception:
                # Try to salvage JSON if wrapped in code fences
                text_out = getattr(resp, "content", str(resp))
                m = re.search(r"\{[\s\S]*\}", text_out)
                out = json.loads(m.group(0)) if m else {}

            idx = out.get("index")
            conf = float(out.get("confidence", 0))
            if not isinstance(idx, int) or not (0 <= idx < len(candidates)) or conf < LLM_MIN_CONFIDENCE:
                # Reject weak or malformed choice
                return json.dumps({"project_name": None, "file_path": None}, default=str, indent=2)

            chosen = candidates[idx]
            # Optionally update context
            try:
                self.project_content.update_project_id(chosen["id"])
            except Exception:
                pass

            return json.dumps(
                {"project_name": chosen["name"], "file_path": chosen["file_path"]},
                default=str,
                indent=2
            )

        except Exception as e:
            logger.error(f"Error retrieving project file with LLM rerank: {e}")
            return json.dumps({"project_name": None, "file_path": None, "error": str(e)}, default=str, indent=2)


    def generate_sql_from_nl(self, query: str) -> str:
        """Convert natural language query to SQL based on database schema."""

        try:
            logger.info(f"Generating SQL from natural language query: {query}")
            # Get current project context
            project_id = self.project_content.last_project_id

            # Load prompts from external files
            system_prompt = SQL_AGENT_PROMPT.format(last_project_id=project_id)
            schema_prompt = SQL_SCHEMA  # keep schema prompt separate

            # Compose messages
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Schema:\n{schema_prompt}\nQuery:\n{query}")
            ]

            # Invoke model
            response = self.model.invoke(messages)

            # Clean SQL output
            sql_query = response.content.strip().replace("``````", "").strip()

            logger.info(f"generated sql Query: {sql_query}")
            return sql_query

        except Exception as e:
           
            return f"Error generating SQL: {e}"

    def expand_related_entities(self, query: str, entity_type: str = "domain") -> str:
        """
        Hybrid semantic expansion: combines LLM reasoning with SQL retrieval
        to find semantically and contextually related domain/technology names,
        then retrieves related projects.

        Parameters:
            query (str): The user query term, e.g. "AI", "Finance", "IT".
            entity_type (str): Either "domain" or "technology".

        Returns:
            JSON string containing:
                - query: original query
                - entity_type: 'domain' or 'technology'
                - related_entities: cleaned list of related names
                - llm_related: raw LLM-derived names
                - project_results: related projects (list of dicts)
        """
        try:
            logger.info(f"Expanding related entities for: {query} in {entity_type} category")

            # -----------------------------
            # Step 1: Retrieve all entity names from database
            # -----------------------------
            base_sql = f"SELECT DISTINCT name FROM {entity_type};"
            raw_results = self.execute_sql_query(base_sql, f"Retrieve all {entity_type} names.")
            logger.info(f"Raw {entity_type} result → {raw_results}")

            try:
                all_entities = [r["name"] for r in json.loads(raw_results)]
            except Exception:
                all_entities = []

            if not all_entities:
                return json.dumps({
                    "related_entities": [],
                    "projects": [],
                    "note": f"No {entity_type} found in database"
                }, indent=2)

            # -----------------------------
            # Step 2: LLM reasoning — conceptual expansion
            # -----------------------------
            llm_prompt = f"""
            You are an expert in semantic mapping of {entity_type}s.

            Below is the list of all available {entity_type} names in the database:
            {all_entities}

            The user is asking about: "{query}"

            Your task:
            - Identify which of the above {entity_type}s are conceptually or hierarchically related to "{query}".
            - Include synonyms, industry subcategories, and contextual equivalents.
            - Return ONLY a valid JSON list of related names (strings). No explanations, no markdown, no commentary.

            Example:
            If query = "Technology" and all_entities = ["Information Technology", "Telecommunication", "Finance", "Healthcare"],
            Output:
            ["Information Technology", "Telecommunication"]
            """

            llm_response = self.model.invoke([
                SystemMessage(content="You are a reasoning assistant that identifies conceptually related entities."),
                HumanMessage(content=llm_prompt)
            ])

            # -----------------------------
            # Step 3: Clean and parse LLM output
            # -----------------------------
            llm_text = llm_response.content.strip()
            # Remove markdown code fences like ```json ... ```
            llm_text = re.sub(r"```(json)?", "", llm_text, flags=re.IGNORECASE).strip()
            llm_text = re.sub(r"```", "", llm_text).strip()
            llm_text = llm_text.replace("\n", " ").replace("\r", " ").strip()

            # Try JSON parsing first
            try:
                llm_related = json.loads(llm_text)
                if not isinstance(llm_related, list):
                    raise ValueError("Parsed JSON is not a list.")
            except Exception:
                # fallback: extract quoted or comma-separated items
                llm_related = re.findall(r'"([^"]+)"', llm_text)
                if not llm_related:
                    llm_related = [
                        x.strip("-,[]'\" ")
                        for x in llm_text.split(",")
                        if len(x.strip()) > 1
                    ]

            # Normalize capitalization & deduplicate
            llm_related = [x.strip().title() for x in llm_related if x.strip()]
            llm_related = list(dict.fromkeys(llm_related))

            # -----------------------------
            # Step 4: Merge final related entities
            # -----------------------------
            combined_related = list(dict.fromkeys([query] + llm_related))
            logger.info(f"Final related {entity_type}s for '{query}': {combined_related}")

            # -----------------------------
            # Step 5: Build SQL dynamically and safely
            # -----------------------------
            # Escape single quotes to prevent injection issues
            safe_names = [name.replace("'", "''") for name in combined_related]

            if entity_type == "domain":
                sql = f"""
                    SELECT DISTINCT p.name AS project_name, d.name AS domain_name
                    FROM project p
                    JOIN project_domain pd ON p.id = pd.project_id
                    JOIN domain d ON pd.domain_id = d.id
                    WHERE {" OR ".join([f"d.name ILIKE '%{name}%'" for name in safe_names])};
                """

            elif entity_type == "technology":
                sql = f"""
                    SELECT DISTINCT p.name AS project_name, t.name AS technology_name
                    FROM project p
                    JOIN project_technology pt ON p.id = pt.project_id
                    JOIN technology t ON pt.technology_id = t.id
                    WHERE {" OR ".join([f"t.name ILIKE '%{name}%'" for name in safe_names])};
                """

            else:
                return json.dumps({"error": "Invalid entity_type. Use 'domain' or 'technology'."}, indent=2)

            # -----------------------------
            # Step 6: Execute SQL query
            # -----------------------------
            project_results = self.execute_sql_query(
                sql,
                f"Retrieve projects for expanded {entity_type} set."
            )

            try:
                projects = json.loads(project_results)
            except Exception:
                projects = []

            # -----------------------------
            # Step 7: Return structured output
            # -----------------------------
            return json.dumps({
                "query": query,
                "entity_type": entity_type,
                "related_entities": combined_related,
                "llm_related": llm_related,
                "project_results": projects
            }, indent=2)

        except Exception as e:
            logger.error(f"Error in expand_related_entities: {e}")
            return json.dumps({"error": str(e)})


    def search_project_by_name(self, project_name: str) -> str:
        """Search for a single project (fuzzy/partial match) and include its documents."""
        try:
            logger.info(f"Searching for project by name: {project_name}")
            with self.engine.begin() as conn:
                # Step 1: Find the most relevant project by name
                project_query = text("""
                    SELECT 
                        p.id,
                        p.name,
                        p.description,
                        similarity(p.name, :name) AS similarity_score
                    FROM project p
                    WHERE p.name ILIKE :pattern
                    OR similarity(p.name, :name) > 0.3
                    ORDER BY similarity_score DESC
                    LIMIT 1
                """)

                project_result = conn.execute(project_query, {
                    "name": project_name,
                    "pattern": f"%{project_name}%"
                }).fetchone()

                if not project_result:
                    logger.info("No matching project found.")
                    return "No projects found"

                project = dict(project_result._mapping)
                project_id = project["id"]

                # Update context with the found project
                self.project_content.update_project_id(project_id)

                # Step 2: Fetch all related documents
                docs_query = text("""
                    SELECT 
                        d.id AS document_id,
                        d.name AS document_name,
                        d.content AS document_content,
                        d.type AS document_type
                    FROM document d
                    WHERE d.project_id = :project_id
                    ORDER BY d.name
                """)

                docs_result = conn.execute(docs_query, {"project_id": project_id})
                documents = [dict(row._mapping) for row in docs_result]

                # Step 3: Build response
                result = {
                    "project_id": project["id"],
                    "project_name": project["name"],
                    "project_description": project["description"],
                    "documents": documents
                }

                return json.dumps(result, default=str, indent=2)

        except Exception as e:
            logger.exception("Error searching project by name")
            return f"Error searching project: {e}"

    def get_current_project_context(self) -> str:
        """Get the last project ID being discussed."""
        if self.project_content.last_project_id:
            try:
                logger.info(f"Getting project context for project ID: {self.project_content.last_project_id}")
                with self.engine.begin() as conn:
                    result = conn.execute(
                        text("""
                        SELECT 
                            p.id,
                            p.name,
                            p.description,
                            d.id AS document_id,
                            d.name AS document_name,
                            d.content AS document_content,
                            d.type AS document_type,
                        FROM project p
                        LEFT JOIN document d ON d.project_id = p.id
                        WHERE p.id = :id
                    """),
                        {"id": self.project_content.last_project_id}
                    )
                    row = result.first()
                    if row:
                        return json.dumps(dict(row._mapping), default=str, indent=2)
            except Exception as e:
                return f"Error getting project context: {e}"
        return "No current project context set."
    

# -------------------- Register Tools --------------------
def register_tools(model, vector_store, recall_vector_store, engine,db_manager):
    """Return a list of LangChain tools with correct wrappers."""
    project_content = ProjectContext()
    tools_instance = AgentTools(model, vector_store, recall_vector_store, engine, project_content,db_manager=db_manager,)

    # Wrap instance methods to remove 'self'
    def save_memory(memory: str, user_id: str):
        return tools_instance.save_recall_memory(memory, user_id)

    def search_memories(query: str, user_id: str):
        return  tools_instance.search_recall_memories(query, user_id)

    def search_slides(query: str):
        return tools_instance.search_slides(query)

    def execute_sql(sql: str, reasoning: str):
        return tools_instance.execute_sql_query(sql, reasoning)
    
    

    def search_project(project_name: str):
        return tools_instance.search_project_by_name(project_name)

    def generate_sql(query: str):
        return tools_instance.generate_sql_from_nl(query)

    def get_project_context():
        return tools_instance.get_current_project_context()
           
    def get_file(project_name:str):
        return tools_instance.get_project_file(project_name)
    
    def expand_entities(query: str, entity_type: str = "domain"):
        return tools_instance.expand_related_entities(query, entity_type)

    return [
        tool(save_memory, description="Save a memory string to recall vector store for the user"),
        tool(search_memories, description="Search and rerank user's recall memories"),
        tool(search_slides, description="Search for relevant slides"),
        tool(execute_sql, args_schema=SQLQueryInput, description="Execute a SQL query and return results"),
        tool(search_project, args_schema=ProjectSearchInput, description="Search for a project by exact or partial name"),
        tool(generate_sql, args_schema=NLQueryInput, description="Convert NL query to expanded SQL, handling domain/tech synonyms."),
        tool(get_project_context, description="Get last project context"),
        tool(get_file,description="Retrieve the file path (download URL) for a project document (RFP/Case Study) by project name."),
        tool(expand_entities, description="Find semantically related domains or technologies and list all matching projects."),
        generate_ppt_tool
    ]

