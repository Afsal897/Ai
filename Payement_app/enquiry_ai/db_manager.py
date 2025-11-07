# db_manager.py
import json
from typing import Optional
from sqlalchemy import create_engine, text
from langchain_postgres.vectorstores import PGVector
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from config import Config
from typing import Dict, Any, Optional
from log import logger
class DBManager:
    def __init__(self):
        self.config = Config()
        self.users: Dict[str, Dict[str, Any]] = {}
        self.embedding_model = GoogleGenerativeAIEmbeddings(
            # Use the full resource path for the model
            model="models/gemini-embedding-001",
            google_api_key=self.config.GOOGLE_API_KEY_1
            # You might also want to add task_type for optimal performance
            # task_type="RETRIEVAL_DOCUMENT" 
        )

        # Engine & SSH tunnel
      
        self.engine = None

        # Vector stores
        self.collection = "Slide_Embeddings"
        self.session_memories = "recall_memories"
        self.vector_store = None
        self.recall_vector_store = None

        # Initialize DB synchronously
        self._initialize_db()

    def _initialize_db(self):
        """Initialize database connection (sync)."""
        try:
            connection_str = (
                f"postgresql+psycopg://{self.config.db_user}:{self.config.db_password}"
                f"@{self.config.db_host}:{self.config.db_port}/{self.config.db_name}"
            )

            self.engine = create_engine(connection_str)
            with self.engine.begin() as conn:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS public;"))
          
        except Exception as e:
            logger.error(f"Failed to start DB connection: {e}")

        """Initialize async components like vector stores."""
        try:
            connection_str = (
                f"postgresql+psycopg://{self.config.db_user}:{self.config.db_password}"
                f"@{self.config.db_host}:{self.config.db_port}/{self.config.db_name}"
            )

            # Init vector stores
            self._init_vector_stores(connection_str)
            
        except Exception as e:
            logger.error(f"❌ DB initialization failed: {e}")
            raise

    def _init_vector_stores(self, connection_str: str):
        """Initialize slides and recall vector stores."""
        try:
            self.vector_store = PGVector.from_existing_index(
                embedding=self.embedding_model,
                connection=connection_str,
                collection_name=self.collection,
                use_jsonb=True,
                pre_delete_collection=False,
            )
           
        except Exception as e:
            logger.warning(f"⚠️ Could not load slides collection: {e}")
            self.vector_store = None

        try:
            self.recall_vector_store = PGVector.from_existing_index(
                connection=connection_str,
                embedding=self.embedding_model,
                collection_name=self.session_memories,
                use_jsonb=True
            )
           
        except Exception as e:
            logger.error(f"❌ Failed to create recall collection: {e}")
            self.recall_vector_store = None
    # Add to DBManager class

    def get_user_role(self, user_id: str) -> Optional[str]:
        """
        Get user role from memory or database. Returns None if user doesn't exist.
        """
        # First check in memory (if profiles cached here)
        if user_id in self.users:
            return self.users[user_id]["role"]

        # Check in database
        user = self._load_single_profile_from_db(user_id)
        if user:
            self.users[user_id] = user

            return user["role"]

        return None  # User doesn't exist

    def _load_single_profile_from_db(self, user_id: str) -> Optional[Dict [str, Any]]:
        """Load a single user profile from database"""
        try:
            with self.engine.begin() as conn:
                result = conn.execute(
                    text("""
                        SELECT 
                            up.tone_score,
                            up.verbosity_score,
                            up.technology_interest,
                            up.domain_interest,
                            up.recent_query,
                            u.role,
                            u.name,
                            u.email
                        FROM user_profile up
                        JOIN "user" u ON up.user_id = u.id
                        WHERE up.user_id = :user_id
                    """),
                    {"user_id": user_id}
                ).mappings().fetchone()
                if result:
                    # Map role integers to string names
                    role_map = {
                        4: "developer",
                        3: "sales",
                        2: "manager",
                        1: "general user"
                    }
                    return {
                        "role": role_map.get(result["role"]),
                        "name": result["name"],
                        "email": result["email"],
                        "tone_score": result["tone_score"] or {"neutral": 0.22, "formal": 0.22, "casual": 0.22},
                        "verbosity_score": result["verbosity_score"] or {"brief": 0.22, "detailed": 0.22, "neutral": 0.22},
                        "technology_interest": result["technology_interest"] or {},
                        "domain_interest": result["domain_interest"] or {},
                        "recent_query": result["recent_query"] or []
                    }

        except Exception as e:
            logger.error(f"Failed to load profile for user {user_id}: {e}")

        return None

    def _save_profile_to_db(self, user_id: str, profile: dict):
        """Save user profile to database."""
       
        if user_id not in self.users:
            return
       
        try:
            with self.engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO user_profile (
                        user_id, tone_score, verbosity_score, technology_interest,
                        domain_interest,recent_query
                    ) VALUES (
                        :user_id, :tone_score, :verbosity_score, :technology_interest,
                        :domain_interest,:recent_query
                    )
                    ON CONFLICT (user_id) DO UPDATE SET
                        tone_score = EXCLUDED.tone_score,
                        verbosity_score = EXCLUDED.verbosity_score,
                        technology_interest = EXCLUDED.technology_interest,
                        domain_interest = EXCLUDED.domain_interest,
                        recent_query = EXCLUDED.recent_query
                """), {
                    "user_id": user_id,
                    "tone_score": json.dumps(profile["tone_score"]),
                    "verbosity_score": json.dumps(profile["verbosity_score"]),
                    "technology_interest": json.dumps(profile["technology_interest"]),
                    "domain_interest": json.dumps(profile["domain_interest"]),
                    "recent_query": json.dumps(profile["recent_query"])
                })
           
        except Exception as e:
            logger.error(f"Failed to save profile for user {user_id}: {e}")

    # -------------------------
# DBManager: Async wrappers
# -------------------------

    def load_recent_messages(self, thread_id: str, limit: int = 20):
        """Load recent messages asynchronously."""
  
        with self.engine.begin() as conn:
                cursor = conn.execute(
                    text("""
                        SELECT m.direction, m.message
                        FROM message m
                        WHERE session_id = :thread_id   
                        ORDER BY m.created_at DESC
                        LIMIT :limit
                    """),
                    {"thread_id": thread_id, "limit": limit}
                )
                rows = cursor.mappings().all()
                # Return newest last
                return [
                            {"role": "user" if r["direction"] == 1 else "assistant",
                            "content": r["message"]}
                            for r in reversed(rows)
                        ]
    

    def _retrieve_messages(self, thread_id: int, limit: int = 3):
        """
        Retrieve last `limit` messages for a given thread_id,
        including both user and assistant messages.
        """
        query = """
            SELECT id, direction, message, file_name, file_path, created_at
            FROM message
            WHERE session_id = :thread_id
            ORDER BY created_at DESC
            LIMIT :limit
        """

        params = {
            "thread_id": thread_id,
            "limit": limit
        }

        with self.engine.begin() as conn:
            result = conn.execute(text(query), params)
            rows = result.mappings().all()  # <-- this is the key fix

        messages = []
        for row in rows:
            messages.append({
                "id": row["id"],
                "direction": row["direction"],
                "message": row["message"],
                "file_name": row["file_name"],
                "file_path": row["file_path"],
                "created_at": row["created_at"]
            })

        return messages
