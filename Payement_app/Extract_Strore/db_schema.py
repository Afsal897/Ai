from config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime,timezone
from sqlalchemy import (Table, Column, Integer, String, Text, ForeignKey,Enum, DateTime, MetaData)

connection_str = f"postgresql+psycopg2://{Config.db_user}:{Config.db_password}@{Config.db_host}:{Config.db_port}/{Config.db_name}"
engine = create_engine(connection_str)
Session = sessionmaker(bind=engine)
session = Session()
# -------------------
# Table Definitions
# -------------------

metadata = MetaData()
project_id_fk = "project.id"

# ---------------- Clients ----------------
clients = Table(
    "client", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(100), unique=True, nullable=False),
)

# ---------------- Projects ----------------
projects = Table(
    "project", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("client_id", Integer, ForeignKey("client.id", ondelete="SET NULL")),
    Column("name", String(100), unique=True),
    Column("description", String(4096)),
)

# ---------------- Domains ----------------
domains = Table(
    "domain", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(100), unique=True, nullable=False),
)

# ---------------- Technologies ----------------
technology = Table(
    "technology", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(100), unique=True, nullable=False),
)

# ---------------- Project  Technologies ----------------
project_technologies = Table(
    "project_technology", metadata,
    Column("project_id", Integer, ForeignKey(project_id_fk, ondelete="CASCADE"), primary_key=True),
    Column("technology_id", Integer, ForeignKey("technology.id", ondelete="CASCADE"), primary_key=True),
)

# ---------------- Project  Domains ----------------
project_domains = Table(
    "project_domain", metadata,
    Column("project_id", Integer, ForeignKey(project_id_fk, ondelete="CASCADE"), primary_key=True),
    Column("domain_id", Integer, ForeignKey("domain.id", ondelete="CASCADE"), primary_key=True),
)

# ---------------- Document Enum ----------------
document_type_enum = Enum(
    "rfp",
    "case study",
    name="document_type_enum"
)

# ---------------- Documents ----------------
documents = Table(
    "document", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("project_id", Integer, ForeignKey(project_id_fk, ondelete="CASCADE")),
    Column("content", String(4096)),
    Column("name", String(50)),
    Column("type", document_type_enum),
    Column("file_path", String(500)),
)

# ---------------- Users ----------------
users = Table(
    "user", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("role", Text, nullable=False),
    Column("created_at", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False),
    Column("updated_at", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False),
)
