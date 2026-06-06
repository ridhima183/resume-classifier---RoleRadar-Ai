"""
Resume history management APIs.

Provides endpoints to list and delete user resume records.
All endpoints require JWT authentication.
"""

from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database import models
from backend.database.session import get_db
from backend.utils.skills import (
    compute_ats_score,
    get_improvement_suggestions,
    get_skill_gaps,
)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ResumeHistoryItem(BaseModel):
    """Single item in resume history list."""

    resume_id: int
    resume_name: str
    predicted_job_role: str
    confidence_score: float
    date_uploaded: str


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api", tags=["resume-history"])


@router.get(
    "/resume_history",
    response_model=List[ResumeHistoryItem],
    summary="Get user's resume history",
    description="Returns list of past resumes and their predictions for the authenticated user.",
)
def get_resume_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[ResumeHistoryItem]:
    """
    Return list of user's past resumes and predictions.

    - Protected: requires valid JWT.
    - Returns only resumes belonging to the authenticated user.
    - Ordered by upload date (newest first).
    """
    # Fetch user's resumes ordered by upload date
    resumes = (
        db.query(models.Resume)
        .filter(models.Resume.user_id == current_user.id)
        .order_by(models.Resume.upload_date.desc())
        .all()
    )

    results: List[ResumeHistoryItem] = []
    for resume in resumes:
        # Get latest prediction for this resume
        latest_pred = (
            db.query(models.PredictionResult)
            .filter(models.PredictionResult.resume_id == resume.id)
            .order_by(models.PredictionResult.id.desc())
            .first()
        )

        if latest_pred:
            results.append(
                ResumeHistoryItem(
                    resume_id=resume.id,
                    resume_name=resume.resume_filename,
                    predicted_job_role=latest_pred.predicted_job_role,
                    confidence_score=latest_pred.confidence_score,
                    date_uploaded=resume.upload_date.isoformat(),
                )
            )

    return results


@router.get(
    "/resume/{resume_id}/analysis",
    summary="Get full analysis for a resume",
    description="Returns predicted role, confidence, extracted skills for viewing detailed analysis.",
)
def get_resume_analysis(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """Return full analysis data for a resume (for View button)."""
    resume = (
        db.query(models.Resume)
        .filter(
            models.Resume.id == resume_id,
            models.Resume.user_id == current_user.id,
        )
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )
    pred = (
        db.query(models.PredictionResult)
        .filter(models.PredictionResult.resume_id == resume_id)
        .order_by(models.PredictionResult.id.desc())
        .first()
    )
    if not pred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this resume.",
        )
    skills = []
    if pred.extracted_skills:
        try:
            skills = json.loads(pred.extracted_skills)
        except Exception:
            pass
    missing = get_skill_gaps(skills, pred.predicted_job_role)
    ats = compute_ats_score(
        skills, missing, pred.confidence_score, pred.predicted_job_role
    )
    suggestions = get_improvement_suggestions(
        skills, missing, ats, pred.confidence_score, pred.predicted_job_role
    )
    return {
        "predicted_job_role": pred.predicted_job_role,
        "confidence_score": pred.confidence_score,
        "extracted_skills": skills,
        "missing_skills": missing,
        "ats_score": ats,
        "improvement_suggestions": suggestions,
        "role_probabilities": {},
    }


@router.delete(
    "/resume/{resume_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a resume",
    description="Delete a specific resume and its prediction. User can only delete their own resumes.",
)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> None:
    """
    Delete a resume and its associated prediction(s).

    - Protected: requires valid JWT.
    - User can only delete their own resumes (ownership check).
    - Cascades to prediction results and analysis logs.
    """
    # Fetch resume and verify ownership
    resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this resume.",
        )

    # Delete resume; related PredictionResult and ResumeAnalysisLog rows
    # are cascade-deleted via ORM relationship / FK ondelete=CASCADE
    db.delete(resume)
    db.commit()


@router.get(
    "/resumes/history",
    response_model=List[dict],
    include_in_schema=False,
    summary="Get resume history (legacy)",
)
def get_resume_history_legacy(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[dict]:
    """
    Legacy alias for /api/resume_history. Returns same data with
    resume_filename and upload_date for frontend compatibility.
    """
    items = get_resume_history(db=db, current_user=current_user)
    return [
        {
            "resume_id": i.resume_id,
            "resume_filename": i.resume_name,
            "predicted_job_role": i.predicted_job_role,
            "confidence_score": i.confidence_score,
            "upload_date": i.date_uploaded,
        }
        for i in items
    ]
