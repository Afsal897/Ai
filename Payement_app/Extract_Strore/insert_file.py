# Configure Gemini

import json
import uuid
import json
import datetime
import numpy as np
from config import Config
from sqlalchemy import insert
from .db_utils import create_session
from langchain_postgres.vectorstores import PGVector
from sqlalchemy.dialects.postgresql import insert as pg_insert
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from .db_schema import projects, documents, technology,project_technologies,domains,clients,project_domains
from log import logger
# -------------------
# Main function to insert file record
# -------------------
VALID_DOC_TYPES = {"rfp", "case study"}
DEFAULT_DOC_TYPE = "case study"
logger.info("Configuring Gemini embedding model.")
embedding_model = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=Config.GOOGLE_API_KEY_3,
    task_type="retrieval_document",
)
collection_name = "Slide_Embeddings"




def normalize_doc_type(file_type: str):
    logger.info("Normalizing document type.")
    """Normalize document type to match the enum."""
    if not file_type:
        return DEFAULT_DOC_TYPE  
    file_type = file_type.lower()
    if "rfp" in file_type:
        return "rfp"
    return DEFAULT_DOC_TYPE

def make_json_safe(value):
    """Convert metadata values into JSON-serializable formats."""
    logger.info("Making JSON safe for value.")
    if isinstance(value, np.ndarray):
        return value.tolist()
    elif isinstance(value, (np.int64, np.float64)):  
        return value.item()
    elif isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    elif isinstance(value, uuid.UUID):
        return str(value)
    elif isinstance(value, (dict, list, str, int, float, bool)) or value is None:
        return value
    else:
        return str(value)


def insert_file_record_full(metadata_nomrs, polished_docs, file_path, summary):
    """Insert full file record into the database with all related entities."""
    logger.info("Inserting full file record into the database.")    
    client_name = safe_lower(metadata_nomrs.get("client_name"), "Unknown Client")
    project_name = safe_lower(metadata_nomrs.get("project_name"), "Unknown Project")
    domain_name = safe_lower(metadata_nomrs.get("domain"), "Unknown Domain")
    doc_type = normalize_doc_type(metadata_nomrs.get("file_type"))
    technologies_list = [
        t.lower().strip() for t in metadata_nomrs.get("technology", []) 
        if isinstance(t, str) and t.strip()
    ] or ["unknown technology"]

    with create_session() as session:
        try:
            logger.info("Inserting related entities.")
            client_id = insert_client(session, client_name)
            project_id = insert_project(session, project_name, client_id, metadata_nomrs)
            domain_id = insert_domain(session, domain_name)
            if domain_id:
                link_project_domain(session, project_id, domain_id)
            insert_technologies(session, project_id, technologies_list)
            insert_document(session, project_id,project_name, doc_type, summary, file_path)
            add_to_vector_store(session, polished_docs)
            session.commit()
            logger.info(f"✅ Inserted project '{project_name}' with {len(polished_docs)} chunks")
        except Exception as e:
            session.rollback()
            logger.error(f"❌ Failed to insert file '{metadata_nomrs.get('file_name', 'Unknown')}': {e}")
            raise

def safe_lower(value, default):
    return str(value).lower() if value else default

def get_or_insert(session, table, name):
    logger.info(f"Getting or inserting {name} into {table.name}.")
    stmt = pg_insert(table).values(name=name).on_conflict_do_nothing()
    session.execute(stmt)
    row = session.execute(table.select().where(table.c.name == name)).fetchone()
    return row.id if row else None

def insert_client(session, client_name):
    logger.info(f"Inserting client: {client_name}")
    if not client_name:
        return None
    return get_or_insert(session, clients, client_name)

def insert_project(session, project_name, client_id, metadata):
    logger.info(f"Inserting project: {project_name}")
    project_row = session.execute(projects.select().where(projects.c.name == project_name)).fetchone()
    if project_row:
        return project_row.id
    result = session.execute(
        insert(projects).values(
            client_id=client_id,
            name=project_name,
            description=str(metadata.get('file_type', ''))
        )
    )
    return result.inserted_primary_key[0]

def insert_domain(session, domain_name):
    logger.info(f"Inserting domain: {domain_name}")
    if not domain_name:
        return None
    return get_or_insert(session, domains, domain_name)

def link_project_domain(session, project_id, domain_id):
    logger.info(f"Linking project ID {project_id} with domain ID {domain_id}.")
    stmt = pg_insert(project_domains).values(project_id=project_id, domain_id=domain_id).on_conflict_do_nothing()
    session.execute(stmt)

def insert_technologies(session, project_id, technologies_list):
    logger.info(f"Inserting technologies for project ID {project_id}.")
    for tech_name in technologies_list:
        tech_id = get_or_insert(session, technology, tech_name)
        if tech_id:
            stmt = pg_insert(project_technologies).values(project_id=project_id, technology_id=tech_id).on_conflict_do_nothing()
            session.execute(stmt)

def insert_document(session, project_id, project_name, doc_type, summary, file_path):
    logger.info(f"Inserting document for project ID {project_id}.")
    doc_content = [{"text": summary}]
    session.execute(
        insert(documents).values(
            project_id=project_id,
            name=project_name,
            type=doc_type,
            content=json.dumps(doc_content, ensure_ascii=False),
            file_path=file_path
        )
    )

def add_to_vector_store(session, polished_docs):
    logger.info("Adding documents to vector store.")
    vector_store = PGVector.from_existing_index(
        connection=session.bind,
        embedding=embedding_model,
        collection_name=collection_name,
        use_jsonb=True,
    )
    vector_store.add_documents(polished_docs)





