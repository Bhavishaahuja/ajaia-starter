from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


def normalize_db_url(url: str) -> str:
    # Supabase and Render hand out postgres:// or postgresql:// URLs.
    # SQLAlchemy needs the driver name to use psycopg 3.
    if url.startswith("https://") or url.startswith("http://"):
        # the Supabase project URL is not a database URL. This was the Render crash.
        raise RuntimeError(
            "DATABASE_URL looks like a web URL. Use the Postgres URI "
            "(postgresql://...) from Supabase Connect, not the project URL."
        )
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


settings = get_settings()
db_url = normalize_db_url(settings.database_url)

connect_args = {}
if db_url.startswith("sqlite"):
    # FastAPI may touch the connection from different threads
    connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
