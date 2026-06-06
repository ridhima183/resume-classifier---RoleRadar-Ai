"""
LinkedIn import APIs: upload PDF or import by URL, run through ML pipeline.

- POST /linkedin/upload: upload LinkedIn PDF (≤5MB), extract text, predict, store.
- POST /linkedin/url-import: fetch URL (validated LinkedIn profile), extract text, predict, store.
- GET /linkedin/history: list current user's LinkedIn imports.

All endpoints require authentication.
"""

from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path
from typing import Any, List

import requests
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.auth import get_current_user
from backend.database import models
from backend.database.session import get_db
from backend.ml.predict import predict_resume_with_probs
from backend.utils.parsers import extract_text_from_pdf
from backend.utils.skills import (
    compute_ats_score,
    extract_skills,
    get_improvement_suggestions,
    get_skill_gaps,
)
from backend.utils.linkedin_parser import (
    extract_text_from_html,
    is_valid_linkedin_profile_url,
    looks_like_linkedin_login_wall,
    resume_like_text_from_raw,
)

router = APIRouter(prefix="/linkedin", tags=["linkedin"])
logger = logging.getLogger(__name__)

MAX_LINKEDIN_PDF_BYTES = 5 * 1024 * 1024  # 5 MB
LINKEDIN_FETCH_TIMEOUT = 15
LINKEDIN_FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ResumeClassifier/1.0)",
    "Accept-Language": "en-US,en;q=0.9",
}


class UrlImportRequest(BaseModel):
    """Request body for LinkedIn URL import."""

    url: str  # validated in endpoint


class LinkedinHistoryItem(BaseModel):
    """Single item in LinkedIn import history."""

    id: int
    source: str
    original_url: str | None
    file_name: str | None
    predicted_job_role: str
    confidence_score: float
    ats_score: int | None
    created_at: str


class LinkedinImportResponse(BaseModel):
    """Structured response for LinkedIn upload and URL import."""

    id: int
    source: str
    original_url: str | None = None
    file_name: str | None = None
    extracted_text: str
    extracted_skills: List[str]
    missing_skills: List[str]
    predicted_job_role: str
    confidence_score: float
    ats_score: int
    improvement_suggestions: List[str]
    role_probabilities: dict[str, float]


def _run_ml_pipeline(resume_text: str) -> dict[str, Any]:
    """Run ML prediction and skill analysis; return dict for response and DB."""
    if not resume_text or not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No text could be extracted. The file or page may be empty or inaccessible.",
        )
    try:
        predicted_job_role, confidence_score, role_probabilities = (
            predict_resume_with_probs(resume_text)
        )
    except FileNotFoundError:
        logger.exception("LinkedIn import failed: ML model file not found.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model not found. Please train the model first.",
        ) from None
    except Exception as e:
        logger.exception("LinkedIn import prediction failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        ) from e

    extracted_skills_list: List[str] = extract_skills(resume_text)
    missing_skills: List[str] = get_skill_gaps(extracted_skills_list, predicted_job_role)
    ats_score: int = compute_ats_score(
        extracted_skills_list,
        missing_skills,
        confidence_score,
        predicted_job_role,
    )
    improvement_suggestions: List[str] = get_improvement_suggestions(
        extracted_skills_list,
        missing_skills,
        ats_score,
        confidence_score,
        predicted_job_role,
    )

    return {
        "predicted_job_role": predicted_job_role,
        "confidence_score": round(confidence_score, 2),
        "extracted_skills": extracted_skills_list,
        "missing_skills": missing_skills,
        "ats_score": ats_score,
        "improvement_suggestions": improvement_suggestions,
        "role_probabilities": role_probabilities,
        "extracted_skills_json": json.dumps(extracted_skills_list) if extracted_skills_list else None,
        "missing_skills_json": json.dumps(missing_skills) if missing_skills else None,
        "improvement_suggestions_json": json.dumps(improvement_suggestions) if improvement_suggestions else None,
        "role_probabilities_json": json.dumps(role_probabilities) if role_probabilities else None,
    }


@router.post(
    "/upload",
    response_model=LinkedinImportResponse,
    summary="Upload LinkedIn PDF",
    description="Upload a LinkedIn profile PDF (export from LinkedIn). Max 5MB. Text is extracted and analyzed.",
)
async def linkedin_upload(
    file: UploadFile = File(..., description="LinkedIn profile PDF"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> LinkedinImportResponse:
    """Upload LinkedIn PDF, extract text, run ML pipeline, store in linkedin_profiles."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for LinkedIn import.",
        )
    contents = await file.read()
    if len(contents) > MAX_LINKEDIN_PDF_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5 MB.",
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty",
        )

    logger.info(
        "LinkedIn PDF upload started. user_id=%s filename=%s size_bytes=%s",
        current_user.id,
        file.filename,
        len(contents),
    )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
        try:
            raw_text = extract_text_from_pdf(tmp_path)
        except Exception as e:
            logger.exception("LinkedIn PDF text extraction failed. filename=%s", file.filename)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to extract text from PDF: {str(e)}",
            ) from e
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    resume_text = resume_like_text_from_raw(raw_text or "")
    result = _run_ml_pipeline(resume_text)

    profile = models.LinkedinProfile(
        user_id=current_user.id,
        source="upload",
        file_name=file.filename,
        extracted_text=resume_text[:50000],
        predicted_job_role=result["predicted_job_role"],
        confidence_score=result["confidence_score"],
        extracted_skills=result["extracted_skills_json"],
        missing_skills=result["missing_skills_json"],
        ats_score=result["ats_score"],
        improvement_suggestions=result["improvement_suggestions_json"],
        role_probabilities=result["role_probabilities_json"],
    )
    db.add(profile)
    db.commit()

    logger.info(
        "LinkedIn PDF upload completed. user_id=%s profile_id=%s predicted_role=%s confidence=%.2f",
        current_user.id,
        profile.id,
        result["predicted_job_role"],
        result["confidence_score"],
    )

    return LinkedinImportResponse(
        id=profile.id,
        source="upload",
        original_url=None,
        file_name=file.filename,
        extracted_text=resume_text,
        predicted_job_role=result["predicted_job_role"],
        confidence_score=result["confidence_score"],
        extracted_skills=result["extracted_skills"],
        missing_skills=result["missing_skills"],
        ats_score=result["ats_score"],
        improvement_suggestions=result["improvement_suggestions"],
        role_probabilities=result["role_probabilities"],
    )


@router.post(
    "/url-import",
    response_model=LinkedinImportResponse,
    summary="Import LinkedIn profile by URL",
    description="Provide a LinkedIn profile URL. Content is fetched and analyzed (may be limited if profile is private).",
)
async def linkedin_url_import(
    body: UrlImportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> LinkedinImportResponse:
    """Fetch LinkedIn profile URL, extract text, run ML pipeline, store in linkedin_profiles."""
    url = (body.url or "").strip()
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is required",
        )
    if not is_valid_linkedin_profile_url(url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid LinkedIn profile URL. Use format: https://www.linkedin.com/in/username",
        )

    logger.info("LinkedIn URL import started. user_id=%s url=%s", current_user.id, url)

    try:
        resp = requests.get(
            url,
            timeout=LINKEDIN_FETCH_TIMEOUT,
            headers=LINKEDIN_FETCH_HEADERS,
            allow_redirects=True,
        )
        resp.raise_for_status()
        html = resp.text
    except requests.RequestException as e:
        logger.exception("LinkedIn URL fetch failed. url=%s", url)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not fetch URL: {str(e)}. Try uploading a LinkedIn PDF export instead.",
        ) from e

    final_url = str(resp.url)
    if looks_like_linkedin_login_wall(html):
        logger.warning(
            "LinkedIn URL import hit login wall. user_id=%s requested_url=%s final_url=%s",
            current_user.id,
            url,
            final_url,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "LinkedIn blocked profile scraping for this URL or requires sign-in. "
                "Please export the profile as PDF from LinkedIn and use Upload PDF instead."
            ),
        )

    raw_text = extract_text_from_html(html)
    resume_text = resume_like_text_from_raw(raw_text)
    if len(resume_text) < 50:
        logger.warning(
            "LinkedIn URL import extracted too little text. user_id=%s url=%s text_len=%s",
            current_user.id,
            url,
            len(resume_text),
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract enough text from the page (LinkedIn may require sign-in). Try exporting your profile as PDF and use Upload instead.",
        )

    result = _run_ml_pipeline(resume_text)

    profile = models.LinkedinProfile(
        user_id=current_user.id,
        source="url",
        original_url=url[:2048],
        extracted_text=resume_text[:50000],
        predicted_job_role=result["predicted_job_role"],
        confidence_score=result["confidence_score"],
        extracted_skills=result["extracted_skills_json"],
        missing_skills=result["missing_skills_json"],
        ats_score=result["ats_score"],
        improvement_suggestions=result["improvement_suggestions_json"],
        role_probabilities=result["role_probabilities_json"],
    )
    db.add(profile)
    db.commit()

    logger.info(
        "LinkedIn URL import completed. user_id=%s profile_id=%s predicted_role=%s confidence=%.2f",
        current_user.id,
        profile.id,
        result["predicted_job_role"],
        result["confidence_score"],
    )

    return LinkedinImportResponse(
        id=profile.id,
        source="url",
        original_url=url,
        file_name=None,
        extracted_text=resume_text,
        predicted_job_role=result["predicted_job_role"],
        confidence_score=result["confidence_score"],
        extracted_skills=result["extracted_skills"],
        missing_skills=result["missing_skills"],
        ats_score=result["ats_score"],
        improvement_suggestions=result["improvement_suggestions"],
        role_probabilities=result["role_probabilities"],
    )


@router.get(
    "/history",
    response_model=List[LinkedinHistoryItem],
    summary="Get LinkedIn import history",
)
def linkedin_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[LinkedinHistoryItem]:
    """Return current user's LinkedIn imports, newest first."""
    rows = (
        db.query(models.LinkedinProfile)
        .filter(models.LinkedinProfile.user_id == current_user.id)
        .order_by(models.LinkedinProfile.created_at.desc())
        .all()
    )
    return [
        LinkedinHistoryItem(
            id=p.id,
            source=p.source,
            original_url=p.original_url,
            file_name=p.file_name,
            predicted_job_role=p.predicted_job_role,
            confidence_score=p.confidence_score,
            ats_score=p.ats_score,
            created_at=p.created_at.isoformat() if p.created_at else "",
        )
        for p in rows
    ]


@router.get(
    "/{profile_id}",
    summary="Get LinkedIn import analysis",
    description="Return full analysis for a LinkedIn import (for View details).",
)
def get_linkedin_analysis(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """Return full analysis for one LinkedIn profile (same shape as resume analysis)."""
    profile = (
        db.query(models.LinkedinProfile)
        .filter(
            models.LinkedinProfile.id == profile_id,
            models.LinkedinProfile.user_id == current_user.id,
        )
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LinkedIn import not found.",
        )
    skills = []
    if profile.extracted_skills:
        try:
            skills = json.loads(profile.extracted_skills)
        except (json.JSONDecodeError, TypeError):
            pass
    missing = []
    if profile.missing_skills:
        try:
            missing = json.loads(profile.missing_skills)
        except (json.JSONDecodeError, TypeError):
            pass
    suggestions = []
    if profile.improvement_suggestions:
        try:
            suggestions = json.loads(profile.improvement_suggestions)
        except (json.JSONDecodeError, TypeError):
            pass
    role_probs = {}
    if profile.role_probabilities:
        try:
            role_probs = json.loads(profile.role_probabilities)
        except (json.JSONDecodeError, TypeError):
            pass
    return {
        "id": profile.id,
        "source": profile.source,
        "original_url": profile.original_url,
        "file_name": profile.file_name,
        "extracted_text": profile.extracted_text,
        "predicted_job_role": profile.predicted_job_role,
        "confidence_score": profile.confidence_score,
        "extracted_skills": skills,
        "missing_skills": missing,
        "ats_score": profile.ats_score or 0,
        "improvement_suggestions": suggestions,
        "role_probabilities": role_probs,
    }
