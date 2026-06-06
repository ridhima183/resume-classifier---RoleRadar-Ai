"""
Application-level settings and environment configuration.

Values can be overridden with environment variables in production.
"""

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]

# Load .env file from project root
load_dotenv(BASE_DIR / ".env")


class Settings:
    def __init__(self):
        # General
        self.app_name: str = "AI Resume Classifier"
        self.debug: bool = False

        # Security / auth
        self.secret_key: str = os.getenv("SECRET_KEY", "change-me")
        self.access_token_expires_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
        self.reset_token_expires_minutes: int = int(os.getenv("RESET_TOKEN_EXPIRES_MINUTES", "30"))
        self.algorithm: str = "HS256"
        self.frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
        self.api_base_url: str = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

        # Optional SMTP config for password reset emails
        self.smtp_host: str = os.getenv("SMTP_HOST", "")
        self.smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username: str = os.getenv("SMTP_USERNAME", "")
        self.smtp_password: str = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "")
        self.smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

        # OAuth Configuration
        self.google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
        self.google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.google_redirect_uri: str = os.getenv(
            "GOOGLE_REDIRECT_URI",
            f"{self.api_base_url.rstrip('/')}/api/auth/google/callback",
        )
        
        self.linkedin_client_id: str = os.getenv("LINKEDIN_CLIENT_ID", "")
        self.linkedin_client_secret: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")
        self.linkedin_redirect_uri: str = os.getenv(
            "LINKEDIN_REDIRECT_URI",
            f"{self.api_base_url.rstrip('/')}/api/auth/linkedin/callback",
        )
        
        self.github_client_id: str = os.getenv("GITHUB_CLIENT_ID", "")
        self.github_client_secret: str = os.getenv("GITHUB_CLIENT_SECRET", "")
        self.github_redirect_uri: str = os.getenv(
            "GITHUB_REDIRECT_URI",
            f"{self.api_base_url.rstrip('/')}/api/auth/github/callback",
        )

        # Password Requirements
        self.password_min_length: int = int(os.getenv("PASSWORD_MIN_LENGTH", "8"))
        self.password_require_uppercase: bool = os.getenv("PASSWORD_REQUIRE_UPPERCASE", "true").lower() == "true"
        self.password_require_numbers: bool = os.getenv("PASSWORD_REQUIRE_NUMBERS", "true").lower() == "true"
        self.password_require_special: bool = os.getenv("PASSWORD_REQUIRE_SPECIAL", "true").lower() == "true"

        # Database
        self.database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'resume_classifier.db'}")

        # Admin: comma-separated list of admin emails
        self.admin_emails: str = os.getenv("ADMIN_EMAILS", "admin@example.com")

        # CORS (Vite default port 5173; Docker/frontend often 3000)
        self.allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173")

    @property
    def allowed_origins_list(self) -> List[str]:
        """Return allowed origins as a list of strings."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
