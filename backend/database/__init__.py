"""
Database package for the Resume Classifier backend.

Uses SQLAlchemy ORM with support for SQLite (dev) and PostgreSQL (production).
All tables are created automatically on app startup via Base.metadata.create_all().

Usage:
    from backend.database import get_db, models
    from backend.database.session import engine, SessionLocal
"""

from __future__ import annotations

from .base import Base
from .models import (
    Feedback,
    JobRole,
    LinkedinProfile,
    PredictionResult,
    Resume,
    ResumeAnalysisLog,
    Skill,
    SystemLog,
    User,
)
from .session import SessionLocal, check_connection, engine, get_db

__all__ = [
    "Base",
    "User",
    "Resume",
    "PredictionResult",
    "ResumeAnalysisLog",
    "JobRole",
    "Skill",
    "LinkedinProfile",
    "Feedback",
    "SystemLog",
    "engine",
    "SessionLocal",
    "get_db",
    "check_connection",
]
