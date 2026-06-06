"""
Email validation utilities for authentication.

Provides email format validation, domain verification, and list validation.
"""

import re
from typing import Tuple


# Email regex pattern based on RFC 5322 (simplified)
EMAIL_PATTERN = re.compile(
    r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
)

# Disposable/temporary email domains to reject (partial list)
DISPOSABLE_DOMAINS = {
    "tempmail.com",
    "temp-mail.org",
    "guerrillamail.com",
    "10minutemail.com",
    "mailinator.com",
    "throwaway.email",
    "trashmail.com",
    "yopmail.com",
    "temp.email",
}


def validate_email_format(email: str) -> Tuple[bool, str]:
    """
    Validate email format against RFC 5322.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    email = email.strip().lower()
    
    if not email:
        return False, "Email is required"
    
    if len(email) > 254:
        return False, "Email is too long (max 254 characters)"
    
    if not EMAIL_PATTERN.match(email):
        return False, "Email format is invalid"
    
    return True, ""


def validate_email_domain(email: str, allow_disposable: bool = False) -> Tuple[bool, str]:
    """
    Validate email domain.
    
    Args:
        email: Email address to validate
        allow_disposable: Whether to allow disposable/temporary email services
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    email = email.strip().lower()
    
    try:
        domain = email.split("@")[1]
    except IndexError:
        return False, "Invalid email format"
    
    if not allow_disposable and domain in DISPOSABLE_DOMAINS:
        return False, "Disposable email addresses are not allowed"
    
    # Basic domain format check
    if not domain or len(domain) < 3:
        return False, "Invalid email domain"
    
    if domain.count(".") == 0 and domain != "localhost":
        return False, "Email domain must contain at least one dot"
    
    return True, ""


def validate_email_comprehensive(
    email: str,
    allow_disposable: bool = False
) -> Tuple[bool, str]:
    """
    Perform comprehensive email validation.
    
    Args:
        email: Email address to validate
        allow_disposable: Whether to allow disposable email services
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # First validate format
    is_valid, error = validate_email_format(email)
    if not is_valid:
        return False, error
    
    # Then validate domain
    is_valid, error = validate_email_domain(email, allow_disposable)
    if not is_valid:
        return False, error
    
    return True, ""


def validate_password_strength(password: str, min_length: int = 8) -> Tuple[bool, str]:
    """
    Validate password strength based on requirements.
    
    Args:
        password: Password to validate
        min_length: Minimum password length
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    from config.settings import settings
    
    if not password:
        return False, "Password is required"
    
    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters"
    
    if settings.password_require_uppercase and not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if settings.password_require_numbers and not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    if settings.password_require_special:
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in password):
            return False, "Password must contain at least one special character (!@#$%^&*...)"
    
    return True, ""
