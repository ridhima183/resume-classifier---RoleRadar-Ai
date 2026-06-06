"""
Recruiter-only APIs.

All endpoints require an authenticated recruiter account that has been approved by admin.
"""

from __future__ import annotations

import json
import re
from typing import List, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.auth import get_verified_recruiter
from backend.database import models
from backend.database.session import get_db


class RecruiterDashboardResponse(BaseModel):
    """Recruiter dashboard summary."""

    recruiter_name: str
    company_name: str | None = None
    company_email: str | None = None
    role: str
    is_verified: bool


class CandidateItem(BaseModel):
    """Candidate card payload for recruiter quick evaluation."""

    id: int
    resume_id: int
    name: str
    skills: List[str]
    predicted_role: str
    score: int
    short_summary: str
    status: str
    resume_link: str


class CandidateListResponse(BaseModel):
    """Paginated candidate listing."""

    items: List[CandidateItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class CandidatePreviewResponse(BaseModel):
    """Resume preview payload for recruiter preview panel."""

    id: int
    resume_id: int
    name: str
    resume_name: str
    predicted_role: str
    score: int
    skills: List[str]
    short_summary: str
    resume_text: str
    status: str


class MatchCandidatesRequest(BaseModel):
    """Request body for JD-based candidate matching."""

    job_description: str


class MatchedCandidateItem(BaseModel):
    """Candidate item enriched with match score."""

    id: int
    resume_id: int
    name: str
    skills: List[str]
    predicted_role: str
    score: int
    short_summary: str
    status: str
    match_score: int
    matching_skills: List[str]


class MatchCandidatesResponse(BaseModel):
    """Ranked candidates for a specific job description."""

    job_keywords: List[str]
    candidates: List[MatchedCandidateItem]


class CandidateStatusResponse(BaseModel):
    """Response after updating a candidate's recruiter status."""

    id: int
    resume_id: int
    status: str
    message: str


class RecruiterAnalyticsResponse(BaseModel):
    """Aggregate recruiter dashboard insights."""

    total_candidates: int
    avg_score: float
    top_skills: List[dict]


router = APIRouter(tags=["recruiter"])

_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "with",
    "will",
    "you",
    "your",
    "we",
    "our",
}


def _extract_keywords(text: str) -> List[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
    filtered: List[str] = []
    seen = set()
    for token in tokens:
        if token in _STOPWORDS or len(token) < 2:
            continue
        if token not in seen:
            filtered.append(token)
            seen.add(token)
    return filtered


def _skill_tokens(skills: List[str]) -> Set[str]:
    tokens: Set[str] = set()
    for skill in skills:
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", skill.lower()):
            if token and token not in _STOPWORDS:
                tokens.add(token)
    return tokens


def _matching_skills(skills: List[str], keywords: Set[str]) -> List[str]:
    matches: List[str] = []
    for skill in skills:
        normalized = skill.lower()
        skill_words = set(
            re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", normalized)
        )
        if keywords.intersection(skill_words):
            matches.append(skill)
    return matches


def _extract_skills(prediction: models.PredictionResult | None) -> List[str]:
    if not prediction or not prediction.extracted_skills:
        return []
    try:
        parsed = json.loads(prediction.extracted_skills)
        if isinstance(parsed, list):
            return [str(skill).strip() for skill in parsed if str(skill).strip()]
    except (TypeError, json.JSONDecodeError):
        return []
    return []


def _parse_candidate_skills(skills_json: str | None) -> List[str]:
    if not skills_json:
        return []
    try:
        parsed = json.loads(skills_json)
        if isinstance(parsed, list):
            return [str(skill).strip() for skill in parsed if str(skill).strip()]
    except (TypeError, json.JSONDecodeError):
        return []
    return []


def _build_summary(text: str, max_chars: int = 220) -> str:
    normalized = re.sub(r"\s+", " ", (text or "")).strip()
    if not normalized:
        return "Resume uploaded, but no preview text is available yet."

    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    summary = ""
    for sentence in sentences:
        if not sentence:
            continue
        candidate = f"{summary} {sentence}".strip()
        if len(candidate) > max_chars:
            break
        summary = candidate

    if not summary:
        summary = normalized[:max_chars].rstrip()
    if len(normalized) > len(summary):
        summary = f"{summary.rstrip('. ')}..."
    return summary


def _compute_score(prediction: models.PredictionResult | None, skills: List[str]) -> int:
    confidence = float(prediction.confidence_score) if prediction else 0.0
    skill_bonus = min(len(skills) * 4, 20)
    role_bonus = 5 if prediction and prediction.predicted_job_role else 0
    score = round(min(100, confidence * 0.75 + skill_bonus + role_bonus))
    return max(score, 0)


def _latest_prediction_for_resume(db: Session, resume_id: int) -> models.PredictionResult | None:
    return (
        db.query(models.PredictionResult)
        .filter(models.PredictionResult.resume_id == resume_id)
        .order_by(models.PredictionResult.id.desc())
        .first()
    )


def _sync_candidates(db: Session) -> None:
    """Refresh recruiter candidate records from current student resumes while preserving status."""
    resumes = (
        db.query(models.Resume)
        .join(models.User, models.User.id == models.Resume.user_id)
        .filter(models.User.role == "student")
        .order_by(models.Resume.upload_date.desc())
        .all()
    )

    active_resume_ids = set()
    for resume in resumes:
        active_resume_ids.add(resume.id)
        prediction = _latest_prediction_for_resume(db, resume.id)
        skills = _extract_skills(prediction)
        predicted_role = prediction.predicted_job_role if prediction else "Unclassified"
        score = _compute_score(prediction, skills)
        short_summary = _build_summary(resume.resume_text)

        candidate = (
            db.query(models.Candidate)
            .filter(models.Candidate.resume_id == resume.id)
            .first()
        )

        if candidate is None:
            candidate = models.Candidate(
                resume_id=resume.id,
                status="pending",
            )
            db.add(candidate)

        candidate.name = resume.user.name
        candidate.skills = json.dumps(skills)
        candidate.predicted_role = predicted_role
        candidate.score = score
        candidate.short_summary = short_summary

    stale_query = (
        db.query(models.Candidate)
        .outerjoin(models.Resume, models.Resume.id == models.Candidate.resume_id)
        .filter(models.Resume.id.is_(None))
    )
    if active_resume_ids:
        stale_query = stale_query.union(
            db.query(models.Candidate).filter(
                ~models.Candidate.resume_id.in_(active_resume_ids)
            )
        )
    stale_candidates = stale_query.all()
    for candidate in stale_candidates:
        db.delete(candidate)

    db.commit()


def _candidate_item_from_model(candidate: models.Candidate) -> CandidateItem:
    skills = _parse_candidate_skills(candidate.skills)
    return CandidateItem(
        id=candidate.id,
        resume_id=candidate.resume_id,
        name=candidate.name,
        skills=skills[:8],
        predicted_role=candidate.predicted_role,
        score=candidate.score,
        short_summary=candidate.short_summary,
        status=candidate.status,
        resume_link=f"/candidates/{candidate.resume_id}/preview",
    )


def _get_candidate_or_404(db: Session, candidate_id: int) -> models.Candidate:
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found.",
        )
    return candidate


@router.get(
    "/recruiter/dashboard",
    response_model=RecruiterDashboardResponse,
    summary="Get recruiter dashboard data",
)
def get_recruiter_dashboard(
    current_user: models.User = Depends(get_verified_recruiter),
) -> RecruiterDashboardResponse:
    """Recruiter header data for the recruiter workspace."""
    return RecruiterDashboardResponse(
        recruiter_name=current_user.name,
        company_name=current_user.company_name,
        company_email=current_user.company_email,
        role=current_user.role,
        is_verified=current_user.is_verified,
    )


@router.get(
    "/candidates",
    response_model=CandidateListResponse,
    summary="List candidates for quick recruiter evaluation",
)
def get_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_verified_recruiter),
) -> CandidateListResponse:
    """Return paginated candidate cards built from uploaded student resumes."""
    _ = current_user
    _sync_candidates(db)

    base_query = db.query(models.Candidate).order_by(models.Candidate.updated_at.desc())
    total = base_query.count()
    candidates = base_query.offset((page - 1) * page_size).limit(page_size).all()
    items = [_candidate_item_from_model(candidate) for candidate in candidates]

    total_pages = (total + page_size - 1) // page_size if total else 0
    return CandidateListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get(
    "/candidates/{resume_id}/preview",
    response_model=CandidatePreviewResponse,
    summary="Preview a candidate resume",
)
def get_candidate_preview(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_verified_recruiter),
) -> CandidatePreviewResponse:
    """Return recruiter-friendly resume preview text and candidate metadata."""
    _ = current_user
    _sync_candidates(db)

    resume = (
        db.query(models.Resume)
        .join(models.User, models.User.id == models.Resume.user_id)
        .filter(
            models.Resume.id == resume_id,
            models.User.role == "student",
        )
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate resume not found.",
        )

    candidate = (
        db.query(models.Candidate)
        .filter(models.Candidate.resume_id == resume.id)
        .first()
    )
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found.",
        )

    skills = _parse_candidate_skills(candidate.skills)

    return CandidatePreviewResponse(
        id=candidate.id,
        resume_id=resume.id,
        name=resume.user.name,
        resume_name=resume.resume_filename,
        predicted_role=candidate.predicted_role,
        score=candidate.score,
        skills=skills,
        short_summary=candidate.short_summary,
        resume_text=resume.resume_text,
        status=candidate.status,
    )


@router.post(
    "/match-candidates",
    response_model=MatchCandidatesResponse,
    summary="Match candidates against a job description",
)
def match_candidates(
    request: MatchCandidatesRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_verified_recruiter),
) -> MatchCandidatesResponse:
    """Rank student candidates by relevance to a provided job description."""
    _ = current_user
    _sync_candidates(db)

    job_description = (request.job_description or "").strip()
    if len(job_description) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a more detailed job description (at least 20 characters).",
        )

    keywords = _extract_keywords(job_description)
    keyword_set = set(keywords)
    if not keyword_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract useful keywords from the job description.",
        )

    candidates = db.query(models.Candidate).order_by(models.Candidate.updated_at.desc()).all()

    ranked: List[MatchedCandidateItem] = []
    for candidate in candidates:
        skills = _parse_candidate_skills(candidate.skills)
        tokens = _skill_tokens(skills)
        overlap = keyword_set.intersection(tokens)
        overlap_ratio = len(overlap) / max(1, len(keyword_set))
        confidence_component = min(candidate.score / 100, 1.0) * 0.35
        overlap_component = overlap_ratio * 0.65
        match_score = round((overlap_component + confidence_component) * 100)
        match_score = max(0, min(100, match_score))

        ranked.append(
            MatchedCandidateItem(
                id=candidate.id,
                resume_id=candidate.resume_id,
                name=candidate.name,
                skills=skills,
                predicted_role=candidate.predicted_role,
                score=candidate.score,
                short_summary=candidate.short_summary,
                status=candidate.status,
                match_score=match_score,
                matching_skills=_matching_skills(skills, keyword_set),
            )
        )

    ranked.sort(
        key=lambda item: (item.match_score, item.score, len(item.matching_skills)),
        reverse=True,
    )

    return MatchCandidatesResponse(
        job_keywords=keywords[:30],
        candidates=ranked,
    )


@router.post(
    "/candidates/{candidate_id}/shortlist",
    response_model=CandidateStatusResponse,
    summary="Shortlist a candidate",
)
def shortlist_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_verified_recruiter),
) -> CandidateStatusResponse:
    """Mark a candidate as shortlisted for recruiter review."""
    _ = current_user
    _sync_candidates(db)
    candidate = _get_candidate_or_404(db, candidate_id)
    candidate.status = "shortlisted"
    db.commit()
    db.refresh(candidate)
    return CandidateStatusResponse(
        id=candidate.id,
        resume_id=candidate.resume_id,
        status=candidate.status,
        message="Candidate shortlisted successfully.",
    )


@router.post(
    "/candidates/{candidate_id}/reject",
    response_model=CandidateStatusResponse,
    summary="Reject a candidate",
)
def reject_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_verified_recruiter),
) -> CandidateStatusResponse:
    """Mark a candidate as rejected for recruiter review."""
    _ = current_user
    _sync_candidates(db)
    candidate = _get_candidate_or_404(db, candidate_id)
    candidate.status = "rejected"
    db.commit()
    db.refresh(candidate)
    return CandidateStatusResponse(
        id=candidate.id,
        resume_id=candidate.resume_id,
        status=candidate.status,
        message="Candidate rejected successfully.",
    )


@router.get(
    "/analytics",
    response_model=RecruiterAnalyticsResponse,
    summary="Get recruiter analytics",
)
def get_recruiter_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_verified_recruiter),
) -> RecruiterAnalyticsResponse:
    """Return aggregate recruiter insights for the candidate pool."""
    _ = current_user
    _sync_candidates(db)

    candidates = db.query(models.Candidate).all()
    total_candidates = len(candidates)
    avg_score = (
        round(sum(candidate.score for candidate in candidates) / total_candidates, 2)
        if total_candidates
        else 0.0
    )

    skill_counts: dict[str, int] = {}
    for candidate in candidates:
        for skill in _parse_candidate_skills(candidate.skills):
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    top_skills = [
        {"skill": skill, "count": count}
        for skill, count in sorted(
            skill_counts.items(),
            key=lambda item: (-item[1], item[0].lower()),
        )[:10]
    ]

    return RecruiterAnalyticsResponse(
        total_candidates=total_candidates,
        avg_score=avg_score,
        top_skills=top_skills,
    )
