"""
User authentication APIs.

Provides signup, login, and JWT verification for protected endpoints.
Passwords are hashed with bcrypt before storage.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from email.message import EmailMessage
import hashlib
import logging
import secrets
import smtplib
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from backend.database import models
from backend.database.session import get_db
from backend.utils.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from config.settings import settings


logger = logging.getLogger(__name__)
PUBLIC_EMAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
}


# ---------------------------------------------------------------------------
# Pydantic schemas for request/response validation
# ---------------------------------------------------------------------------


class SignupRequest(BaseModel):
    """Request body for user signup."""

    name: str
    email: EmailStr
    password: str


class RecruiterSignupRequest(SignupRequest):
    """Request body for recruiter signup."""

    company_name: str = Field(min_length=2, max_length=255)
    company_email: EmailStr
    verification_doc: Optional[str] = Field(default=None, max_length=1024)
    linkedin_url: Optional[str] = Field(default=None, max_length=1024)

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Company name must be at least 2 characters.")
        return cleaned

    @field_validator("company_email")
    @classmethod
    def validate_company_email(cls, value: EmailStr) -> str:
        email = value.lower().strip()
        domain = email.split("@")[-1]
        if domain in PUBLIC_EMAIL_DOMAINS:
            raise ValueError("Recruiter signup requires a company email address.")
        return email

    @field_validator("verification_doc", "linkedin_url")
    @classmethod
    def normalize_optional_fields(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @model_validator(mode="after")
    def validate_verification_proof(self) -> "RecruiterSignupRequest":
        login_email = self.email.lower().strip()
        login_domain = login_email.split("@")[-1]
        if login_domain in PUBLIC_EMAIL_DOMAINS:
            raise ValueError("Recruiter login email must be a company email address.")
        if not self.verification_doc and not self.linkedin_url:
            raise ValueError(
                "Provide either a verification document reference or a LinkedIn URL."
            )
        if self.linkedin_url and "linkedin.com/" not in self.linkedin_url.lower():
            raise ValueError("LinkedIn URL must point to linkedin.com.")
        return self


class SignupResponse(BaseModel):
    """Response after successful signup."""

    id: int
    name: str
    email: str
    role: str
    is_verified: bool
    message: str = "User created successfully"


class TokenResponse(BaseModel):
    """Response containing JWT access token."""

    access_token: str
    token_type: str = "bearer"
    role: str
    is_verified: bool


class UserResponse(BaseModel):
    """Current user profile (for /api/me)."""

    id: int
    name: str
    email: str
    account_created_date: Optional[str] = None
    is_admin: bool = False
    role: str = "student"
    is_verified: bool = False
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    verification_doc: Optional[str] = None
    linkedin_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    """Request body for password change."""

    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    """Request body for forgot password."""

    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Generic forgot-password response."""

    message: str
    reset_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    """Request body for password reset."""

    token: str
    new_password: str


# ---------------------------------------------------------------------------
# OAuth2 scheme for JWT bearer token (used by protected endpoints)
# ---------------------------------------------------------------------------

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/login",
    auto_error=True,
)


# ---------------------------------------------------------------------------
# Auth router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api", tags=["authentication"])


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _build_reset_url(token: str) -> str:
    base_url = settings.frontend_url.rstrip("/")
    return f"{base_url}/reset-password?token={token}"


def _send_reset_email(email: str, reset_url: str) -> bool:
    """Send a password reset email when SMTP is configured."""
    if not settings.smtp_host or not settings.smtp_from_email:
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your RoleRadar AI password"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        "We received a request to reset your password.\n\n"
        f"Use this link to set a new password:\n{reset_url}\n\n"
        f"This link expires in {settings.reset_token_expires_minutes} minutes.\n"
        "If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
    return True


def _issue_password_reset(db: Session, user: models.User) -> str:
    """Create a fresh single-use reset token for a user."""
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.used.is_(False),
    ).update({"used": True}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    db.add(
        models.PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_reset_token(raw_token),
            expires_at=datetime.utcnow()
            + timedelta(minutes=settings.reset_token_expires_minutes),
        )
    )
    db.commit()
    return raw_token


# ---------------------------------------------------------------------------
# JWT verification dependency (use as "middleware" for protected endpoints)
# ---------------------------------------------------------------------------


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Dependency that verifies JWT and returns the current user.

    Use this on any endpoint that requires authentication:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            ...

    Raises 401 if token is missing, invalid, or user not found.
    """
    payload = decode_token(token)
    email: Optional[str] = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject.",
        )
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Token may be invalid or user was deleted.",
        )
    return user


def require_role(*allowed_roles: Literal["student", "recruiter", "admin"]):
    """Dependency factory that restricts access to specific roles."""

    def dependency(
        current_user: models.User = Depends(get_current_user),
    ) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user

    return dependency


def get_verified_recruiter(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Require a recruiter account that has been approved by admin."""
    if current_user.role != "recruiter" or not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verified recruiter access required.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Register a new user with email and password. Password is hashed before storage.",
)
def signup(request: SignupRequest, db: Session = Depends(get_db)) -> SignupResponse:
    """
    Create a new user account.

    - Validates that email is not already registered.
    - Hashes password with bcrypt before storing (never stores plain text).
    - Returns user id, name, and email on success.
    """
    # Check if user with this email already exists
    existing = db.query(models.User).filter(models.User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email or login.",
        )

    # Hash password before storage (bcrypt - secure one-way hashing)
    password_hash = hash_password(request.password)

    # Create and persist user
    user = models.User(
        name=request.name.strip(),
        email=request.email.lower().strip(),
        password_hash=password_hash,
        role="student",
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return SignupResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
    )


@router.post("/auth/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup_legacy(request: SignupRequest, db: Session = Depends(get_db)) -> SignupResponse:
    """Alias for POST /api/signup (frontend compatibility)."""
    return signup(request, db)


@router.post(
    "/recruiter/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a recruiter account",
    description="Register a recruiter account that requires admin approval before recruiter features are available.",
)
def recruiter_signup(
    request: RecruiterSignupRequest,
    db: Session = Depends(get_db),
) -> SignupResponse:
    """Create a recruiter account pending admin verification."""
    normalized_email = request.email.lower().strip()
    company_email = request.company_email.lower().strip()

    existing = db.query(models.User).filter(models.User.email == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email or login.",
        )

    password_hash = hash_password(request.password)
    user = models.User(
        name=request.name.strip(),
        email=normalized_email,
        password_hash=password_hash,
        role="recruiter",
        is_verified=False,
        company_name=request.company_name,
        company_email=company_email,
        verification_doc=request.verification_doc,
        linkedin_url=request.linkedin_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return SignupResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
        message="Recruiter account created and submitted for admin approval.",
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and get JWT token",
    description="Authenticate with email and password. Returns a JWT token for use in Authorization header.",
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    role: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate user and return JWT access token.

    - Verifies email and password against stored hash.
    - Returns JWT token to be sent as: Authorization: Bearer <token>
    - Token expires after configured duration (default 60 minutes).
    - OAuth-only accounts cannot login via email/password.
    """
    # Look up user by email (OAuth2PasswordRequestForm uses 'username' for email)
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # Verify user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    selected_role = role.strip().lower() if role else None
    if selected_role and selected_role not in {"student", "recruiter"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected. Choose student or recruiter.",
        )
    if selected_role and user.role != selected_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as {user.role}. Please switch role and try again.",
        )

    # Check if user is OAuth-only account (no password hash)
    if user.is_oauth_account and not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"This account is linked to {user.oauth_provider}. Please use social login.",
        )

    # Check password
    if not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Verify user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been disabled.",
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    db.commit()

    # Create JWT token (sub = subject, typically user identifier)
    token = create_access_token({"sub": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        is_verified=user.is_verified,
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
) -> UserResponse:
    """Return the current authenticated user's profile."""
    admin_emails = {
        e.strip().lower()
        for e in settings.admin_emails.split(",")
        if e.strip()
    }
    is_admin = current_user.email.lower() in admin_emails
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        account_created_date=(
            current_user.account_created_date.isoformat()
            if current_user.account_created_date
            else None
        ),
        is_admin=is_admin,
        role=current_user.role,
        is_verified=current_user.is_verified,
        company_name=current_user.company_name,
        company_email=current_user.company_email,
        verification_doc=current_user.verification_doc,
        linkedin_url=current_user.linkedin_url,
    )


@router.patch("/me/password")
def change_password(
    request: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update the current user's password."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Generate a password reset token and send a reset email when possible."""
    user = (
        db.query(models.User)
        .filter(models.User.email == request.email.lower().strip())
        .first()
    )

    generic_message = (
        "If an account exists for that email, password reset instructions have been sent."
    )
    if not user:
        return ForgotPasswordResponse(message=generic_message)

    raw_token = _issue_password_reset(db, user)
    reset_url = _build_reset_url(raw_token)

    try:
        sent = _send_reset_email(user.email, reset_url)
    except Exception:
        logger.exception("Failed to send password reset email to %s", user.email)
        sent = False

    if not sent:
        logger.warning("Password reset email not configured. Reset link for %s: %s", user.email, reset_url)
        return ForgotPasswordResponse(message=generic_message, reset_url=reset_url)

    return ForgotPasswordResponse(message=generic_message)


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Reset a user's password using a single-use token."""
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters.",
        )

    token_hash = _hash_reset_token(request.token)
    reset_record = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token_hash == token_hash)
        .first()
    )
    if (
        not reset_record
        or reset_record.used
        or reset_record.expires_at < datetime.utcnow()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or has expired.",
        )

    reset_record.user.password_hash = hash_password(request.new_password)
    reset_record.used = True
    db.commit()
    return {"message": "Password reset successfully."}


@router.post("/auth/reset-password")
def reset_password_legacy(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Alias for POST /api/reset-password to support frontend auth-prefixed routes."""
    return reset_password(request, db)


@router.post("/auth/token", response_model=TokenResponse)
def login_legacy(
    form_data: OAuth2PasswordRequestForm = Depends(),
    role: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Alias for POST /api/login (frontend compatibility)."""
    return login(form_data, role, db)
