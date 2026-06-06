"""
User feedback APIs: submit and list feedback.

- POST /feedback/submit: submit rating and optional comments (authenticated).
- GET /feedback/my-feedback: list current user's feedback (authenticated).
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database import models
from backend.database.session import get_db

router = APIRouter(prefix="/feedback", tags=["feedback"])


class SubmitFeedbackRequest(BaseModel):
    """Request body for submitting feedback."""

    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    comments: str | None = Field(default=None, max_length=2000)


class FeedbackItem(BaseModel):
    """Single feedback entry."""

    id: int
    rating: int
    comments: str | None
    created_at: str


@router.post(
    "/submit",
    status_code=status.HTTP_201_CREATED,
    summary="Submit feedback",
    description="Submit a rating (1-5) and optional comments. Requires authentication.",
)
def submit_feedback(
    body: SubmitFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """Create a new feedback entry for the current user."""
    feedback = models.Feedback(
        user_id=current_user.id,
        rating=body.rating,
        comments=body.comments.strip() if body.comments else None,
    )
    db.add(feedback)
    db.commit()
    return {"id": feedback.id, "message": "Thank you for your feedback."}


@router.get(
    "/my-feedback",
    response_model=List[FeedbackItem],
    summary="Get my feedback",
    description="List all feedback submissions by the current user.",
)
def my_feedback(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[FeedbackItem]:
    """Return current user's feedback history, newest first."""
    rows = (
        db.query(models.Feedback)
        .filter(models.Feedback.user_id == current_user.id)
        .order_by(models.Feedback.created_at.desc())
        .all()
    )
    return [
        FeedbackItem(
            id=f.id,
            rating=f.rating,
            comments=f.comments,
            created_at=f.created_at.isoformat() if f.created_at else "",
        )
        for f in rows
    ]
