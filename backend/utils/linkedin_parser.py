"""
LinkedIn import helpers: URL validation, fetch, and text extraction.

For URL import we attempt to fetch the page; LinkedIn often requires login,
so we extract whatever text we can (e.g. from public profile or login page).
PDF uploads are handled via existing extract_text_from_pdf.
"""

from __future__ import annotations

import re
from html import unescape

# Optional: use BeautifulSoup for HTML parsing if available
try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

# LinkedIn profile URL pattern (e.g. https://www.linkedin.com/in/username or https://linkedin.com/in/username)
LINKEDIN_PROFILE_PATTERN = re.compile(
    r"^https?://(www\.)?linkedin\.com/in/[\w\-]+/?(\?.*)?$",
    re.IGNORECASE,
)


def is_valid_linkedin_profile_url(url: str) -> bool:
    """Return True if url looks like a LinkedIn profile URL."""
    if not url or not url.strip():
        return False
    return LINKEDIN_PROFILE_PATTERN.match(url.strip()) is not None


def extract_text_from_html(html: str, max_chars: int = 100_000) -> str:
    """
    Extract plain text from HTML for use as resume-like content.
    Strips tags and normalizes whitespace.
    """
    if not html or not html.strip():
        return ""
    if HAS_BS4:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        meta_parts = []
        for name in ("description", "og:description", "title", "og:title"):
            tag = soup.find("meta", attrs={"name": name}) or soup.find("meta", attrs={"property": name})
            if tag and tag.get("content"):
                meta_parts.append(tag["content"])
        text_parts = meta_parts + [soup.get_text(separator=" ", strip=True)]
        text = " ".join(part for part in text_parts if part)
    else:
        # Fallback: strip tags with regex (good enough for basic extraction)
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
    text = unescape(re.sub(r"\s+", " ", text).strip())
    return text[:max_chars] if len(text) > max_chars else text


def resume_like_text_from_raw(raw: str) -> str:
    """
    Convert raw extracted text (from LinkedIn PDF or HTML) to a single block
    suitable for the ML pipeline. Normalizes whitespace and preserves structure.
    """
    if not raw or not raw.strip():
        return ""
    text = re.sub(r"\r\n", "\n", raw)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def looks_like_linkedin_login_wall(html: str) -> bool:
    """Detect common LinkedIn sign-in or challenge pages."""
    if not html:
        return True
    normalized = html.lower()
    markers = [
        "sign in to linkedin",
        "join linkedin",
        "linkedin login",
        "linkedin: log in or sign up",
        "challenge",
        "checkpoint/challenge",
        "authwall",
    ]
    return any(marker in normalized for marker in markers)
