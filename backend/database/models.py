"""
SQLAlchemy ORM models for the Resume Classifier database.

Tables:
- users: Registered users (auth)
- resumes: Uploaded resume files and extracted text
- prediction_results: ML predictions per resume (job role, confidence, skills)
- resume_analysis_logs: Audit trail of prediction runs
- job_roles, skills: Reference data (optional)
- feedback: User feedback/ratings
- system_logs: Application error/info logs
"""

from __future__ import annotations

from datetime import datetime
from typing import List

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Boolean,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base


class User(Base):
    """
    Registered user accounts for authentication.

    Used by auth APIs (signup/login) and linked to resumes and feedback.
    Supports both traditional email/password and OAuth social login.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth-only accounts
    account_created_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # 'google', 'linkedin', 'github', or NULL for traditional auth
    oauth_id = Column(String(255), nullable=True, unique=True, index=True)
    is_oauth_account = Column(Boolean, default=False, nullable=False)
    
    # Account status
    email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(String(20), default="student", nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    company_name = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
    verification_doc = Column(String(1024), nullable=True)
    linkedin_url = Column(String(1024), nullable=True)
    
    # Profile management
    avatar_url = Column(String(500), nullable=True)  # URL to user's profile avatar
    last_login = Column(DateTime, nullable=True)  # Track last login timestamp

    resumes: List["Resume"] = relationship("Resume", back_populates="user")
    feedback: List["Feedback"] = relationship("Feedback", back_populates="user")
    linkedin_profiles: List["LinkedinProfile"] = relationship(
        "LinkedinProfile", back_populates="user"
    )
    password_reset_tokens: List["PasswordResetToken"] = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class PasswordResetToken(Base):
    """Single-use password reset token for a user."""

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user: User = relationship("User", back_populates="password_reset_tokens")


class Resume(Base):
    """
    Uploaded resume record: filename, extracted text, upload timestamp.

    Linked to User (owner) and has one-to-many with PredictionResult and ResumeAnalysisLog.
    When a Resume is deleted, related predictions and logs are cascade-deleted.
    """

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_filename = Column(String(255), nullable=False)
    resume_text = Column(Text, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    user: User = relationship("User", back_populates="resumes")
    predictions: List["PredictionResult"] = relationship(
        "PredictionResult",
        back_populates="resume",
        cascade="all, delete-orphan",
    )
    logs: List["ResumeAnalysisLog"] = relationship(
        "ResumeAnalysisLog",
        back_populates="resume",
        cascade="all, delete-orphan",
    )
    candidate: "Candidate" = relationship(
        "Candidate",
        back_populates="resume",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Candidate(Base):
    """
    Recruiter-facing candidate record derived from a student's latest resume state.

    Stores a persisted recruiter status so shortlist/reject actions survive refreshes.
    Skills are stored as a JSON string for SQLite compatibility.
    """

    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(
        Integer,
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    name = Column(String(100), nullable=False)
    skills = Column(Text, nullable=False, default="[]")
    predicted_role = Column(String(100), nullable=False, default="Unclassified")
    score = Column(Integer, nullable=False, default=0)
    short_summary = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    resume: Resume = relationship("Resume", back_populates="candidate")


class PredictionResult(Base):
    """
    ML prediction outcome for a resume.

    Stores predicted job role, confidence score (0-100), and extracted skills (JSON).
    One resume can have multiple predictions if re-analyzed; APIs use the latest.
    """

    __tablename__ = "prediction_results"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(
        Integer,
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
    )
    predicted_job_role = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    extracted_skills = Column(Text, nullable=True)  # JSON array of skill strings

    resume: Resume = relationship("Resume", back_populates="predictions")


class ResumeAnalysisLog(Base):
    """
    Audit log entry for each resume analysis run.

    Records which model was used and when. Used for analytics and debugging.
    """

    __tablename__ = "resume_analysis_logs"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(
        Integer,
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
    )
    model_used = Column(String(100), nullable=False)
    prediction_time = Column(DateTime, default=datetime.utcnow, nullable=False)

    resume: Resume = relationship("Resume", back_populates="logs")


class JobRole(Base):
    """
    Reference table of known job roles (optional).

    Can be used for validation or job role descriptions.
    """

    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Skill(Base):
    """
    Reference table of known skills (optional).

    Can be used for skill extraction lexicon or categorization.
    """

    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(100), nullable=True)


class LinkedinProfile(Base):
    """
    LinkedIn import result: PDF upload or URL import, processed through ML pipeline.
    """

    __tablename__ = "linkedin_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source = Column(String(20), nullable=False)  # "upload" | "url"
    original_url = Column(String(2048), nullable=True)
    file_name = Column(String(255), nullable=True)
    extracted_text = Column(Text, nullable=False)
    predicted_job_role = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    extracted_skills = Column(Text, nullable=True)  # JSON array
    missing_skills = Column(Text, nullable=True)  # JSON array
    ats_score = Column(Integer, nullable=True)
    improvement_suggestions = Column(Text, nullable=True)  # JSON array
    role_probabilities = Column(Text, nullable=True)  # JSON object
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user: User = relationship("User", back_populates="linkedin_profiles")


class Feedback(Base):
    """
    User feedback (ratings, comments) for analytics.
    """

    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user: User = relationship("User", back_populates="feedback")


class SystemLog(Base):
    """
    Application log entries (errors, info) stored in the database.

    Useful for admin dashboards and debugging in production.
    """

    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    context = Column(Text, nullable=True)
