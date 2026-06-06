"""
Database engine and session management for the Resume Classifier backend.

Supports SQLite (development) and PostgreSQL (production) via DATABASE_URL.
Use get_db() as a FastAPI dependency for request-scoped sessions.
"""

from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from config.settings import settings

# Build engine options: PostgreSQL benefits from connection pooling
_engine_kwargs: dict = {
    "future": True,
    "echo": settings.debug,  # Log SQL when debug is on
}
# Use connection pool for PostgreSQL (postgresql:// or postgresql+psycopg2://)
if settings.database_url.startswith(("postgresql", "postgres+")):
    _engine_kwargs.update(
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,  # Recycle connections after 5 minutes
    )

engine = create_engine(settings.database_url, **_engine_kwargs)

# Session factory: each request gets a new session, closed after response
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session per request.

    Session is automatically closed when the request ends, ensuring
    connections are returned to the pool and no leaks occur.

    Usage:
        @app.get("/items")
        def list_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> bool:
    """
    Verify database connectivity. Useful for health checks and startup.

    Returns:
        True if connection succeeds, False otherwise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

