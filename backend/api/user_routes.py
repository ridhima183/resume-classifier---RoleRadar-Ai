"""
User profile management and account endpoints.

Provides routes for:
- Editing user profile (name, email)
- Uploading and managing profile avatars
- Viewing security information (email, last login)
- Deleting user accounts
"""

from __future__ import annotations

import base64
import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.database import models
from backend.database.session import get_db
from backend.api.auth import get_current_user
from backend.utils.security import hash_password, verify_password
from backend.utils.email_validator import validate_email_format
from config.settings import settings


logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pydantic schemas for request/response validation
# ---------------------------------------------------------------------------


class EditProfileRequest(BaseModel):
    """Request body for editing user profile."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None


class EditProfileResponse(BaseModel):
    """Response after profile edit."""

    id: int
    name: str
    email: str
    avatar_url: Optional[str]
    message: str


class SecurityInfoResponse(BaseModel):
    """Security information about user account."""

    email: str
    email_verified: bool
    is_active: bool
    account_created_date: str
    last_login: Optional[str]
    oauth_provider: Optional[str]


class DeleteAccountRequest(BaseModel):
    """Request body for account deletion (confirmation)."""

    password: str
    confirmation: bool = Field(..., description="Must be True to confirm deletion")


class DeleteAccountResponse(BaseModel):
    """Response after account deletion."""

    message: str


# ---------------------------------------------------------------------------
# User routes router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/user", tags=["user-profile"])


@router.put(
    "/profile",
    response_model=EditProfileResponse,
    summary="Edit user profile",
    description="Update user's name and/or email address.",
)
def edit_profile(
    request: EditProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EditProfileResponse:
    """
    Edit the current user's profile (name and/or email).

    - Name must be 1-100 characters if provided.
    - Email must be valid and not already in use.
    - Updates are applied immediately.
    """
    # Validate that at least one field is provided
    if request.name is None and request.email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field (name or email) must be provided.",
        )

    # Update name if provided
    if request.name is not None:
        current_user.name = request.name.strip()  # type: ignore

    # Update email if provided
    if request.email is not None:
        email_lower = request.email.lower().strip()

        # Validate email format
        if not validate_email_format(email_lower):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format.",
            )

        # Check if email is already in use by another user
        existing = (
            db.query(models.User)
            .filter(
                models.User.email == email_lower,
                models.User.id != current_user.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered to another account.",
            )

        current_user.email = email_lower  # type: ignore

    db.commit()
    db.refresh(current_user)

    return EditProfileResponse(
        id=current_user.id,  # type: ignore
        name=current_user.name,  # type: ignore
        email=current_user.email,  # type: ignore
        avatar_url=current_user.avatar_url,  # type: ignore
        message="Profile updated successfully.",
    )


@router.post(
    "/avatar",
    response_model=dict,
    summary="Upload profile avatar",
    description="Upload a profile picture (PNG, JPG, max 5MB). Stored as base64 data URL.",
)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Upload and store user's profile avatar.

    - Accepts PNG, JPG/JPEG images.
    - Maximum file size: 5MB.
    - Stored as base64 data URL in avatar_url field for easy frontend display.
    - Returns the data URL for immediate display.
    """
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PNG and JPG images are allowed.",
        )

    # Read file and validate size
    content = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 5MB limit.",
        )

    # Convert to base64 data URL
    b64_content = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64_content}"

    # Store in database
    current_user.avatar_url = data_url  # type: ignore
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Avatar uploaded successfully.",
        "avatar_url": current_user.avatar_url,  # type: ignore
    }


@router.get(
    "/security-info",
    response_model=SecurityInfoResponse,
    summary="Get account security information",
    description="Retrieve security-related account information.",
)
def get_security_info(
    current_user: models.User = Depends(get_current_user),
) -> SecurityInfoResponse:
    """
    Get security information about the current user's account.

    Returns:
    - Email and verification status
    - Account active status
    - Account creation date
    - Last login timestamp (if available)
    - OAuth provider if account is OAuth-linked
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return SecurityInfoResponse(
        email=current_user.email,  # type: ignore
        email_verified=current_user.email_verified,  # type: ignore
        is_active=current_user.is_active,  # type: ignore
        account_created_date=(
            current_user.account_created_date.isoformat()  # type: ignore
            if current_user.account_created_date is not None  # type: ignore
            else None
        ),
        last_login=(
            current_user.last_login.isoformat()  # type: ignore
            if current_user.last_login is not None  # type: ignore
            else None
        ),
        oauth_provider=current_user.oauth_provider,  # type: ignore
    )


@router.delete(
    "/account",
    response_model=DeleteAccountResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete user account",
    description="Permanently delete the user account and all associated data (irreversible).",
)
def delete_account(
    request: DeleteAccountRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeleteAccountResponse:
    """
    Permanently delete the current user's account.

    - Requires password confirmation for password-based accounts (or skipped for OAuth-only).
    - Requires explicit confirmation (confirmation=true).
    - Cascades delete: resumes, predictions, feedback, etc.
    - This operation is IRREVERSIBLE.
    """
    # Verify confirmation
    if not request.confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account deletion must be confirmed (confirmation=true).",
        )

    # For password-based accounts, verify current password
    if current_user.password_hash is not None:  # type: ignore
        from backend.utils.security import verify_password

        if not verify_password(request.password, current_user.password_hash):  # type: ignore
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password. Account deletion cancelled.",
            )
    # For OAuth-only accounts, password verification is still required for security
    elif not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for account deletion.",
        )

    # Delete user (cascade deletes all related data)
    user_id = current_user.id
    db.delete(current_user)
    db.commit()

    logger.info(f"User {user_id} account deleted successfully.")

    return DeleteAccountResponse(
        message="Account deleted successfully. All data has been removed.",
    )
