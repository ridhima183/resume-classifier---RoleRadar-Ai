"""
Resume file parsers for PDF and DOCX.

Uses pdfminer for PDF extraction and python-docx for DOCX.
"""

from __future__ import annotations

from pathlib import Path
from typing import Union

from docx import Document
from pdfminer.high_level import extract_text as pdfminer_extract_text


def extract_text_from_pdf(path: Union[str, Path]) -> str:
    """
    Extract text from a PDF file using pdfminer.
    """
    p = Path(path)
    text = pdfminer_extract_text(str(p))
    return (text or "").strip()


def extract_text_from_docx(path: Union[str, Path]) -> str:
    """
    Extract text from a DOCX file using python-docx.
    """
    p = Path(path)
    doc = Document(p)
    lines = [para.text for para in doc.paragraphs]
    return "\n".join(lines).strip()

