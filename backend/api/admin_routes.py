"""
Admin APIs for Resume Classifier.

Provides endpoints for model retraining, system analytics, user management,
logs, and analytics. All endpoints require admin authentication (JWT + admin email in ADMIN_EMAILS).
"""

from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database import models
from backend.database.session import get_db
from backend.ml.config import MODELS_DIR
from backend.ml.train_model import run_training_and_save_metrics
from config.settings import settings


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Admin auth: verify user is in ADMIN_EMAILS list
# ---------------------------------------------------------------------------

def get_current_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """
    Dependency: verify the authenticated user is an admin.

    Admin emails are configured via ADMIN_EMAILS env var (comma-separated).
    Raises 403 if user is not an admin.
    """
    admin_emails = {
        e.strip().lower()
        for e in settings.admin_emails.split(",")
        if e.strip()
    }
    if current_user.email.lower() not in admin_emails:
        logger.warning(f"Admin access denied for user: {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class RetrainResponse(BaseModel):
    """Response after triggering model retraining."""

    message: str
    status: str = "started"


class AdminStatsResponse(BaseModel):
    """Analytics response for admin stats endpoint."""

    total_users: int
    total_resumes_analyzed: int
    model_performance: Dict[str, Any]


class UserListItem(BaseModel):
    """User summary for admin user list."""

    id: int
    name: str
    email: str
    account_created_date: Optional[str] = None
    resume_count: int = 0
    role: str = "student"
    is_verified: bool = False


class RecruiterVerificationItem(BaseModel):
    """Pending recruiter verification item."""

    id: int
    name: str
    email: str
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    verification_doc: Optional[str] = None
    linkedin_url: Optional[str] = None
    account_created_date: Optional[str] = None
    is_verified: bool = False


class LogEntry(BaseModel):
    """System log entry."""

    id: int
    level: str
    message: str
    created_at: str
    context: Optional[str] = None


class AnalyticsResponse(BaseModel):
    """Analytics: resumes per day, top skills, top job roles."""

    resumes_per_day: List[Dict[str, Any]]
    top_skills: List[Dict[str, Any]]
    top_job_roles: List[Dict[str, Any]]


class AdminFeedbackItem(BaseModel):
    """Feedback entry for admin list."""

    id: int
    user_id: int
    user_email: Optional[str] = None
    rating: int
    comments: Optional[str] = None
    created_at: str


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/admin", tags=["admin"])


def _run_training_task() -> None:
    """
    Background task: run ML training and save metrics.
    Logs progress and errors.
    """
    try:
        logger.info("Admin retrain: starting model training")
        metrics = run_training_and_save_metrics()
        logger.info(
            f"Admin retrain: completed. Best model: {metrics.get('best_model', 'unknown')}"
        )
    except Exception as e:
        logger.exception(f"Admin retrain failed: {e}")


@router.post(
    "/retrain_model",
    response_model=RetrainResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger model retraining",
    description="Starts ML model retraining in the background. Training may take several minutes.",
)
def retrain_model(
    background_tasks: BackgroundTasks,
    current_admin: models.User = Depends(get_current_admin),
) -> RetrainResponse:
    """
    Trigger retraining of ML models.

    - Runs training in a background task (non-blocking).
    - Saves updated model and metrics when complete.
    - Returns immediately with 202 Accepted.
    """
    logger.info(f"Admin retrain requested by: {current_admin.email}")
    background_tasks.add_task(_run_training_task)
    return RetrainResponse(
        message="Model retraining started. Check logs for completion status.",
        status="started",
    )


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    summary="Get admin analytics",
    description="Returns system statistics: total users, resumes analyzed, and model performance metrics.",
)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
) -> AdminStatsResponse:
    """
    Return analytics for the admin dashboard.

    - total_users: count of registered users
    - total_resumes_analyzed: count of resume uploads
    - model_performance: accuracy, F1, ROC-AUC from last training run
    """
    # Total users
    total_users = db.query(models.User).count()

    # Total resumes analyzed
    total_resumes = db.query(models.Resume).count()

    # Model performance metrics (from last training run)
    metrics_path = MODELS_DIR / "metrics.json"
    model_performance: Dict[str, Any] = {}
    if metrics_path.exists():
        try:
            with open(metrics_path) as f:
                model_performance = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load metrics.json: {e}")
            model_performance = {"error": "Failed to load metrics"}
    else:
        model_performance = {
            "message": "No metrics available. Run model retraining to populate.",
        }

    logger.debug(f"Admin stats requested by: {current_admin.email}")
    return AdminStatsResponse(
        total_users=total_users,
        total_resumes_analyzed=total_resumes,
        model_performance=model_performance,
    )


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------


@router.get(
    "/users",
    response_model=List[UserListItem],
    summary="List all users",
)
def list_users(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
) -> List[UserListItem]:
    """Return all registered users with resume counts."""
    users = db.query(models.User).order_by(models.User.account_created_date.desc()).all()
    result = []
    for u in users:
        resume_count = db.query(models.Resume).filter(models.Resume.user_id == u.id).count()
        result.append(
            UserListItem(
                id=u.id,
                name=u.name,
                email=u.email,
                account_created_date=(
                    u.account_created_date.isoformat() if u.account_created_date else None
                ),
                resume_count=resume_count,
                role=u.role,
                is_verified=u.is_verified,
            )
        )
    return result


@router.get(
    "/recruiters/unverified",
    response_model=List[RecruiterVerificationItem],
    summary="List unverified recruiters",
)
def list_unverified_recruiters(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
) -> List[RecruiterVerificationItem]:
    """Return all recruiter accounts that are still pending verification."""
    recruiters = (
        db.query(models.User)
        .filter(
            models.User.role == "recruiter",
            models.User.is_verified.is_(False),
        )
        .order_by(models.User.account_created_date.asc())
        .all()
    )
    return [
        RecruiterVerificationItem(
            id=user.id,
            name=user.name,
            email=user.email,
            company_name=user.company_name,
            company_email=user.company_email,
            verification_doc=user.verification_doc,
            linkedin_url=user.linkedin_url,
            account_created_date=(
                user.account_created_date.isoformat() if user.account_created_date else None
            ),
            is_verified=user.is_verified,
        )
        for user in recruiters
    ]


@router.patch(
    "/recruiters/{user_id}/approve",
    response_model=RecruiterVerificationItem,
    summary="Approve recruiter",
)
def approve_recruiter(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
) -> RecruiterVerificationItem:
    """Approve a recruiter account so recruiter-only routes become available."""
    recruiter = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.role == "recruiter",
        )
        .first()
    )
    if not recruiter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recruiter not found.",
        )

    recruiter.is_verified = True
    db.commit()
    db.refresh(recruiter)

    return RecruiterVerificationItem(
        id=recruiter.id,
        name=recruiter.name,
        email=recruiter.email,
        company_name=recruiter.company_name,
        company_email=recruiter.company_email,
        verification_doc=recruiter.verification_doc,
        linkedin_url=recruiter.linkedin_url,
        account_created_date=(
            recruiter.account_created_date.isoformat()
            if recruiter.account_created_date
            else None
        ),
        is_verified=recruiter.is_verified,
    )


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
) -> None:
    """Delete a user and all associated data (resumes, predictions, etc.)."""
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account.",
        )
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    db.delete(user)
    db.commit()
    logger.info(f"Admin {current_admin.email} deleted user {user_id} ({user.email})")


# ---------------------------------------------------------------------------
# System logs
# ---------------------------------------------------------------------------


@router.get(
    "/logs",
    response_model=List[LogEntry],
    summary="Get system logs",
)
def get_logs(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
    level: Optional[str] = Query(None, description="Filter by level: INFO, WARNING, ERROR"),
    limit: int = Query(100, ge=1, le=500),
) -> List[LogEntry]:
    """Return system logs from the database, optionally filtered by level."""
    q = db.query(models.SystemLog).order_by(models.SystemLog.created_at.desc()).limit(limit)
    if level:
        q = q.filter(models.SystemLog.level == level.upper())
    logs = q.all()
    return [
        LogEntry(
            id=log.id,
            level=log.level,
            message=log.message,
            created_at=log.created_at.isoformat() if log.created_at else "",
            context=log.context,
        )
        for log in logs
    ]


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get analytics",
)
def get_analytics(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
    days: int = Query(30, ge=7, le=365, description="Number of days for resumes_per_day"),
) -> AnalyticsResponse:
    """Return analytics: resumes per day, top skills, top job roles."""
    since = datetime.utcnow() - timedelta(days=days)

    # Resumes per day
    rows = (
        db.query(func.date(models.Resume.upload_date).label("day"), func.count(models.Resume.id))
        .filter(models.Resume.upload_date >= since)
        .group_by(func.date(models.Resume.upload_date))
        .order_by(func.date(models.Resume.upload_date))
        .all()
    )
    resumes_per_day = [{"date": str(r.day), "count": r[1]} for r in rows]

    # Top job roles from prediction_results (latest per resume)
    role_counts = (
        db.query(models.PredictionResult.predicted_job_role, func.count(models.PredictionResult.id))
        .join(models.Resume, models.PredictionResult.resume_id == models.Resume.id)
        .filter(models.Resume.upload_date >= since)
        .group_by(models.PredictionResult.predicted_job_role)
        .order_by(func.count(models.PredictionResult.id).desc())
        .limit(20)
        .all()
    )
    top_job_roles = [{"role": r[0], "count": r[1]} for r in role_counts]

    # Top skills from extracted_skills (JSON array in prediction_results)
    all_skills: List[str] = []
    preds = (
        db.query(models.PredictionResult.extracted_skills)
        .join(models.Resume, models.PredictionResult.resume_id == models.Resume.id)
        .filter(models.Resume.upload_date >= since)
        .all()
    )
    for (skills_json,) in preds:
        if skills_json:
            try:
                skills = json.loads(skills_json) if isinstance(skills_json, str) else skills_json
                if isinstance(skills, list):
                    all_skills.extend(s for s in skills if isinstance(s, str))
            except (json.JSONDecodeError, TypeError):
                pass
    skill_counts = Counter(all_skills).most_common(30)
    top_skills = [{"skill": s, "count": c} for s, c in skill_counts]

    return AnalyticsResponse(
        resumes_per_day=resumes_per_day,
        top_skills=top_skills,
        top_job_roles=top_job_roles,
    )


# ---------------------------------------------------------------------------
# Admin: all feedback
# ---------------------------------------------------------------------------


@router.get(
    "/feedback",
    response_model=List[AdminFeedbackItem],
    summary="Get all feedback (admin)",
)
def get_admin_feedback(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
    limit: int = Query(100, ge=1, le=500),
) -> List[AdminFeedbackItem]:
    """Return all user feedback for admin review."""
    rows = (
        db.query(models.Feedback, models.User.email)
        .join(models.User, models.Feedback.user_id == models.User.id)
        .order_by(models.Feedback.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        AdminFeedbackItem(
            id=f.id,
            user_id=f.user_id,
            user_email=email,
            rating=f.rating,
            comments=f.comments,
            created_at=f.created_at.isoformat() if f.created_at else "",
        )
        for f, email in rows
    ]
