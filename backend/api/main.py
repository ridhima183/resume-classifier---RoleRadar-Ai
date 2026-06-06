"""
AI Resume Classifier API.

Entry point for the FastAPI application. Includes auth, resume, and admin routes.
"""

from __future__ import annotations

import logging
import traceback
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.database.base import Base
from backend.database import models
from backend.database.session import engine, get_db
from config.settings import settings

from backend.api.admin_routes import router as admin_router
from backend.api.auth import router as auth_router
from backend.api.feedback_routes import router as feedback_router
from backend.api.history import router as history_router
from backend.api.linkedin_routes import router as linkedin_router
from backend.api.recruiter_routes import router as recruiter_router
from backend.api.routes import router as resume_router
from backend.api.oauth import router as oauth_router
from backend.api.user_routes import router as user_router

app = FastAPI(title=settings.app_name)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unhandled exceptions (non-HTTPException) to system_logs and return 500."""
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    tb = traceback.format_exc()
    try:
        db = next(get_db())
        log_entry = models.SystemLog(
            level="ERROR",
            message=str(exc),
            context=tb[:4000] if len(tb) > 4000 else tb,
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        pass  # Avoid failing if DB logging fails
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.allowed_origins_list],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Create tables if they do not exist
    from backend.database.init_db import init_db
    init_db()
    print("✅ Database awakened and ready!")


# Include auth routes (POST /api/signup, POST /api/login)
app.include_router(auth_router)
# Include user profile routes (PUT /user/profile, POST /user/avatar, GET /user/security-info, DELETE /user/account)
app.include_router(user_router)
# Include OAuth routes (GET /api/auth/google/callback, /api/auth/github/callback, /api/auth/linkedin/callback)
app.include_router(oauth_router)
# Include resume upload routes (POST /api/upload_resume)
app.include_router(resume_router)
# Include resume history routes (GET /api/resume_history, DELETE /api/resume/{id})
app.include_router(history_router)
# LinkedIn import (POST /linkedin/upload, POST /linkedin/url-import, GET /linkedin/history)
app.include_router(linkedin_router)
# Recruiter-only routes
app.include_router(recruiter_router)
# User feedback (POST /feedback/submit, GET /feedback/my-feedback)
app.include_router(feedback_router)
# Include admin routes (POST /admin/retrain_model, GET /admin/stats, GET /admin/feedback)
app.include_router(admin_router)


@app.get("/api/health")
def health_check() -> dict:
    """Health check endpoint. Verifies API is up and database is reachable."""
    from backend.database import check_connection

    db_ok = check_connection()
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected" if db_ok else "disconnected",
    }
