"""
Example application-level settings.

Copy this file to `settings.py` and adjust values for your environment.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

# Security / auth
SECRET_KEY = "change-me"

# Database URL (e.g. for SQLAlchemy)
DATABASE_URL = "sqlite:///" + str(BASE_DIR / "resume_classifier.db")

# CORS origins for frontend
ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

