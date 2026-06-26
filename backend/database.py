import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import get_settings
from logger import get_logger

log = get_logger(__name__)
settings = get_settings()


def _resolve_database_url() -> str:
    url = settings.database_url
    if not url:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, "leads.db")
        log.info("DATABASE_URL not set - using local SQLite: %s", db_path)
        return f"sqlite:///{db_path}"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    log.info("Connecting to database via DATABASE_URL (PostgreSQL/Supabase)")
    return url


DATABASE_URL = _resolve_database_url()

engine = create_engine(
    DATABASE_URL,
    **({"connect_args": {"check_same_thread": False}} if DATABASE_URL.startswith("sqlite") else {}),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
