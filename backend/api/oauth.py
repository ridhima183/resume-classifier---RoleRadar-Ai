"""
OAuth2 social login handlers for Google, LinkedIn, and GitHub.

Provides OAuth callback handling and user account linking/creation.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import models
from backend.database.session import get_db
from backend.utils.security import create_access_token
from config.settings import settings


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/auth", tags=["oauth"])


class OAuthUserInfo(BaseModel):
    """OAuth user info response."""
    id: int
    name: str
    email: str


class OAuthTokenResponse(BaseModel):
    """OAuth token response."""
    access_token: str
    token_type: str = "bearer"
    user: OAuthUserInfo


def _mask_value(value: str) -> str:
    if not value:
        return "(missing)"
    if len(value) <= 8:
        return f"{value[:2]}***"
    return f"{value[:4]}...{value[-4:]}"


def _frontend_oauth_redirect(
    provider: str,
    *,
    access_token: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
) -> RedirectResponse:
    target = f"{settings.frontend_url.rstrip('/')}/login"
    params = {"provider": provider}
    if access_token:
        params["access_token"] = access_token
    if error:
        params["oauth_error"] = error
    if error_description:
        params["oauth_error_description"] = error_description
    return RedirectResponse(
        url=f"{target}#{urlencode(params)}",
        status_code=status.HTTP_302_FOUND,
    )


async def _get_google_user_info(code: str) -> Optional[dict]:
    """Exchange Google auth code for user info."""
    if not settings.google_client_id or not settings.google_client_secret:
        logger.warning("Google OAuth is not configured. client_id=%s", _mask_value(settings.google_client_id))
        return None

    logger.info(
        "Google OAuth exchange started. client_id=%s redirect_uri=%s",
        _mask_value(settings.google_client_id),
        settings.google_redirect_uri,
    )
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # Get user info
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_response.raise_for_status()
            return user_response.json()
    except Exception as e:
        logger.error(f"Failed to get Google user info: {e}")
        return None


async def _get_github_user_info(code: str) -> Optional[dict]:
    """Exchange GitHub auth code for user info."""
    if not settings.github_client_id or not settings.github_client_secret:
        logger.warning("GitHub OAuth is not configured. client_id=%s", _mask_value(settings.github_client_id))
        return None

    logger.info(
        "GitHub OAuth exchange started. client_id=%s redirect_uri=%s",
        _mask_value(settings.github_client_id),
        settings.github_redirect_uri,
    )
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "code": code,
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "redirect_uri": settings.github_redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            user_response.raise_for_status()
            return user_response.json()
    except Exception as e:
        logger.error(f"Failed to get GitHub user info: {e}")
        return None


async def _get_linkedin_user_info(code: str) -> Optional[dict]:
    """Exchange LinkedIn auth code for user info."""
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        logger.warning("LinkedIn OAuth is not configured. client_id=%s", _mask_value(settings.linkedin_client_id))
        return None

    logger.info(
        "LinkedIn OAuth exchange started. client_id=%s redirect_uri=%s",
        _mask_value(settings.linkedin_client_id),
        settings.linkedin_redirect_uri,
    )
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "code": code,
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                    "redirect_uri": settings.linkedin_redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # LinkedIn OIDC profile endpoint matches the "openid profile email" scopes
            profile_response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            profile_response.raise_for_status()

            profile_data = profile_response.json()

            return {
                "id": profile_data.get("sub"),
                "name": profile_data.get("name", "User"),
                "email": profile_data.get("email"),
            }
    except Exception as e:
        logger.error(f"Failed to get LinkedIn user info: {e}")
        return None


@router.get("/google/callback")
async def google_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """
    Google OAuth callback endpoint.
    Exchanges authorization code for user token.
    """
    if error:
        return _frontend_oauth_redirect("google", error=error, error_description=error_description)
    if not code:
        return _frontend_oauth_redirect("google", error="missing_code", error_description="Authorization code not provided.")

    user_info = await _get_google_user_info(code)
    
    if not user_info:
        return _frontend_oauth_redirect(
            "google",
            error="google_auth_failed",
            error_description="Failed to authenticate with Google. Check client ID, secret, and redirect URI.",
        )
    
    email = user_info.get("email", "").lower().strip()
    oauth_id = user_info.get("id")
    name = user_info.get("name", "User")
    
    if not email or not oauth_id:
        return _frontend_oauth_redirect(
            "google",
            error="google_profile_incomplete",
            error_description="Could not retrieve email or account ID from Google.",
        )
    
    # Find or create user
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        # Create new user from Google
        user = models.User(
            name=name,
            email=email,
            oauth_provider="google",
            oauth_id=oauth_id,
            is_oauth_account=True,
            email_verified=True,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.is_oauth_account is False:
        # Link Google account to existing email user
        user.oauth_provider = "google"  # type: ignore
        user.oauth_id = oauth_id  # type: ignore
        user.is_oauth_account = True  # type: ignore
        user.email_verified = True  # type: ignore
        db.commit()
    
    # Update last login timestamp
    user.last_login = datetime.utcnow()  # type: ignore
    db.commit()
    
    # Create JWT token
    token = create_access_token({"sub": user.email})
    return _frontend_oauth_redirect("google", access_token=token)


@router.get("/github/callback")
async def github_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """
    GitHub OAuth callback endpoint.
    Exchanges authorization code for user token.
    """
    if error:
        return _frontend_oauth_redirect("github", error=error, error_description=error_description)
    if not code:
        return _frontend_oauth_redirect("github", error="missing_code", error_description="Authorization code not provided.")

    user_info = await _get_github_user_info(code)
    
    if not user_info:
        return _frontend_oauth_redirect(
            "github",
            error="github_auth_failed",
            error_description="Failed to authenticate with GitHub. Check client ID, secret, and redirect URI.",
        )
    
    email = user_info.get("email", "").lower().strip()
    oauth_id = str(user_info.get("id"))
    name = user_info.get("name") or user_info.get("login", "User")
    
    if not email or not oauth_id:
        return _frontend_oauth_redirect(
            "github",
            error="github_profile_incomplete",
            error_description="Could not retrieve email or account ID from GitHub.",
        )
    
    # Find or create user
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        # Create new user from GitHub
        user = models.User(
            name=name,
            email=email,
            oauth_provider="github",
            oauth_id=oauth_id,
            is_oauth_account=True,
            email_verified=True,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.is_oauth_account is False:
        # Link GitHub account to existing email user
        user.oauth_provider = "github"  # type: ignore
        user.oauth_id = oauth_id  # type: ignore
        user.is_oauth_account = True  # type: ignore
        user.email_verified = True  # type: ignore
        db.commit()
    
    # Update last login timestamp
    user.last_login = datetime.utcnow()  # type: ignore
    db.commit()
    
    # Create JWT token
    token = create_access_token({"sub": user.email})
    return _frontend_oauth_redirect("github", access_token=token)


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """
    LinkedIn OAuth callback endpoint.
    Exchanges authorization code for user token.
    """
    if error:
        return _frontend_oauth_redirect("linkedin", error=error, error_description=error_description)
    if not code:
        return _frontend_oauth_redirect("linkedin", error="missing_code", error_description="Authorization code not provided.")

    user_info = await _get_linkedin_user_info(code)
    
    if not user_info:
        return _frontend_oauth_redirect(
            "linkedin",
            error="linkedin_auth_failed",
            error_description="Failed to authenticate with LinkedIn. Check client ID, secret, redirect URI, and enabled OpenID product.",
        )
    
    email = user_info.get("email", "").lower().strip()
    oauth_id = user_info.get("id")
    name = user_info.get("name", "User")
    
    if not email or not oauth_id:
        return _frontend_oauth_redirect(
            "linkedin",
            error="linkedin_profile_incomplete",
            error_description="Could not retrieve email or account ID from LinkedIn.",
        )
    
    # Find or create user
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        # Create new user from LinkedIn
        user = models.User(
            name=name,
            email=email,
            oauth_provider="linkedin",
            oauth_id=oauth_id,
            is_oauth_account=True,
            email_verified=True,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.is_oauth_account is False:
        # Link LinkedIn account to existing email user
        user.oauth_provider = "linkedin"  # type: ignore
        user.oauth_id = oauth_id  # type: ignore
        user.is_oauth_account = True  # type: ignore
        user.email_verified = True  # type: ignore
        db.commit()
    
    # Update last login timestamp
    user.last_login = datetime.utcnow()  # type: ignore
    db.commit()
    
    # Create JWT token
    token = create_access_token({"sub": user.email})
    return _frontend_oauth_redirect("linkedin", access_token=token)
