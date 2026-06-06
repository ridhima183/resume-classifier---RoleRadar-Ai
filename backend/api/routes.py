"""
Resume upload and prediction API routes.

Provides POST /api/upload_resume for uploading PDF/DOCX resumes,
extracting text, running ML prediction, and storing results.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.database import models
from backend.database.session import get_db
from backend.ml.predict import predict_resume_with_probs
from backend.utils.parsers import extract_text_from_docx, extract_text_from_pdf
from backend.api.auth import get_current_user
from backend.utils.skills import (
    compute_ats_score,
    extract_skills,
    get_improvement_suggestions,
    get_skill_gaps,
)

router = APIRouter(prefix="/api", tags=["resume"])

# Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/upload_resume",
    response_model=dict,
    summary="Upload resume and get prediction",
    description="Upload a PDF or DOCX resume. Text is extracted, passed to the ML model, "
                "and the predicted job role, confidence, and extracted skills are returned.",
)
async def upload_resume(
    file: UploadFile = File(..., description="Resume file (PDF or DOCX)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """
    Upload resume, extract text, run ML prediction, store result, and return JSON.

    - Validates file type (PDF/DOCX) and size.
    - Extracts text using pdfminer (PDF) or python-docx (DOCX).
    - Calls predict_resume() from the ML module.
    - Extracts skills from resume text.
    - Saves resume and prediction to database.
    """
    # --- 1. File validation ---
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF and DOCX files are supported. Received: {ext}",
        )

    # Read file content and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB",
        )
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty",
        )

    # --- 2. Save to temp file for parsing ---
    suffix = ".pdf" if ext == ".pdf" else ".docx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # --- 3. Extract text from resume ---
        try:
            if ext == ".pdf":
                resume_text = extract_text_from_pdf(tmp_path)
            else:
                resume_text = extract_text_from_docx(tmp_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to extract text from file: {str(e)}",
            )

        if not resume_text or not resume_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No text could be extracted from the file. The file may be image-based or corrupted.",
            )

        # --- 4. Run ML prediction ---
        try:
            predicted_job_role, confidence_score, role_probabilities = (
                predict_resume_with_probs(resume_text)
            )
        except FileNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ML model not found. Please train the model first (run: python train_model.py)",
            ) from e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Prediction failed: {str(e)}",
            ) from e

        # --- 5. Extract skills and compute analysis ---
        extracted_skills: List[str] = extract_skills(resume_text)
        missing_skills: List[str] = get_skill_gaps(
            extracted_skills, predicted_job_role
        )
        ats_score: int = compute_ats_score(
            extracted_skills,
            missing_skills,
            confidence_score,
            predicted_job_role,
        )
        improvement_suggestions: List[str] = get_improvement_suggestions(
            extracted_skills,
            missing_skills,
            ats_score,
            confidence_score,
            predicted_job_role,
        )

        # --- 6. Store in database ---
        try:
            resume = models.Resume(
                user_id=current_user.id,
                resume_filename=file.filename,
                resume_text=resume_text,
            )
            db.add(resume)
            db.commit()
            db.refresh(resume)

            prediction = models.PredictionResult(
                resume_id=resume.id,
                predicted_job_role=predicted_job_role,
                confidence_score=confidence_score,
                extracted_skills=json.dumps(extracted_skills) if extracted_skills else None,
            )
            db.add(prediction)

            log = models.ResumeAnalysisLog(
                resume_id=resume.id,
                model_used="resume_classifier_model",
            )
            db.add(log)

            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save to database: {str(e)}",
            ) from e
    finally:
        # Clean up temp file
        Path(tmp_path).unlink(missing_ok=True)

    # --- 7. Return JSON response ---
    return {
        "predicted_job_role": predicted_job_role,
        "confidence_score": round(confidence_score, 2),
        "extracted_skills": extracted_skills,
        "missing_skills": missing_skills,
        "ats_score": ats_score,
        "improvement_suggestions": improvement_suggestions,
        "role_probabilities": role_probabilities,
    }


# Alias for frontend compatibility
@router.post("/resumes/upload")
async def upload_resume_alias(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> dict:
    """Alias for POST /api/upload_resume."""
    return await upload_resume(file=file, db=db, current_user=current_user)
