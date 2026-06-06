"""
SQLAlchemy declarative base for all ORM models.

All database models inherit from Base to ensure consistent table metadata
and migration support. Used by models in this package.
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Allow legacy List[] relationship annotations (SQLAlchemy 2.0 compatible)."""
    __allow_unmapped__ = True

