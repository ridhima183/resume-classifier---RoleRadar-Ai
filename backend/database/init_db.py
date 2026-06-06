"""
Database initialization utilities.

Creates all tables if they do not exist. Run from CLI or on app startup.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

from sqlalchemy import inspect, text

# Handle both relative imports (from app) and direct script execution
try:
    from .base import Base
    from .session import engine
except ImportError:
    # When run as a script directly, use absolute imports
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from backend.database.base import Base
    from backend.database.session import engine

logger = logging.getLogger(__name__)


def _apply_sqlite_compat_migrations() -> None:
    """
    Add missing columns/tables for older SQLite databases.

    This keeps existing local data usable without requiring Alembic.
    """
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "users" in existing_tables:
            user_columns = {
                column["name"]
                for column in inspector.get_columns("users")
            }
            missing_user_columns = {
                "oauth_provider": "ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50)",
                "oauth_id": "ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255)",
                "is_oauth_account": "ALTER TABLE users ADD COLUMN is_oauth_account BOOLEAN NOT NULL DEFAULT 0",
                "email_verified": "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0",
                "is_active": "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1",
                "role": "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student'",
                "is_verified": "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0",
                "company_name": "ALTER TABLE users ADD COLUMN company_name VARCHAR(255)",
                "company_email": "ALTER TABLE users ADD COLUMN company_email VARCHAR(255)",
                "verification_doc": "ALTER TABLE users ADD COLUMN verification_doc VARCHAR(1024)",
                "linkedin_url": "ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(1024)",
                "avatar_url": "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)",
                "last_login": "ALTER TABLE users ADD COLUMN last_login DATETIME",
            }
            for column_name, statement in missing_user_columns.items():
                if column_name not in user_columns:
                    conn.execute(text(statement))
                    logger.info("Added missing users.%s column to SQLite database.", column_name)

        if "password_reset_tokens" not in existing_tables:
            conn.execute(
                text(
                    """
                    CREATE TABLE password_reset_tokens (
                        id INTEGER NOT NULL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        token_hash VARCHAR(255) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used BOOLEAN NOT NULL DEFAULT 0,
                        created_at DATETIME NOT NULL,
                        FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash "
                    "ON password_reset_tokens (token_hash)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_id "
                    "ON password_reset_tokens (id)"
                )
            )
            logger.info("Created missing password_reset_tokens table in SQLite database.")

        if "candidates" not in existing_tables:
            conn.execute(
                text(
                    """
                    CREATE TABLE candidates (
                        id INTEGER NOT NULL PRIMARY KEY,
                        resume_id INTEGER NOT NULL UNIQUE,
                        name VARCHAR(100) NOT NULL,
                        skills TEXT NOT NULL DEFAULT '[]',
                        predicted_role VARCHAR(100) NOT NULL DEFAULT 'Unclassified',
                        score INTEGER NOT NULL DEFAULT 0,
                        short_summary TEXT NOT NULL DEFAULT '',
                        status VARCHAR(20) NOT NULL DEFAULT 'pending',
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        FOREIGN KEY(resume_id) REFERENCES resumes (id) ON DELETE CASCADE
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_candidates_resume_id "
                    "ON candidates (resume_id)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_candidates_id "
                    "ON candidates (id)"
                )
            )
            logger.info("Created missing candidates table in SQLite database.")


def init_db() -> None:
    """
    Create all database tables defined in the ORM models.

    Safe to call multiple times: existing tables are left unchanged.
    Used on app startup and for manual setup.
    """
    _apply_sqlite_compat_migrations()
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")


def drop_db() -> None:
    """
    Drop all database tables. Use with caution (development only).
    """
    Base.metadata.drop_all(bind=engine)
    logger.warning("Database tables dropped.")


if __name__ == "__main__":
    """Allow running this script directly for database initialization."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    init_db()
    print("✅ Database initialized successfully!")
