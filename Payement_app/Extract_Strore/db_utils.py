from config import Config
from sqlalchemy import create_engine
from contextlib import contextmanager
from sqlalchemy.orm import sessionmaker

@contextmanager
def create_session():
    
    connection_str = f"postgresql+psycopg2://{Config.db_user}:{Config.db_password}@{Config.db_host}:{Config.db_port}/{Config.db_name}"
    engine = create_engine(connection_str, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()