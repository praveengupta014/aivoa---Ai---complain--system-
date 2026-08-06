"""
Lightweight document -> text extraction. Per the assignment brief,
production-grade OCR/parsing is explicitly NOT required, so this covers the
common cases (PDF, DOCX, TXT, EML) with simple, dependable libraries.
"""

import io
import email
from email import policy


def extract_text_from_bytes(filename: str, content: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return _extract_pdf(content)
    if lower.endswith(".docx"):
        return _extract_docx(content)
    if lower.endswith(".eml"):
        return _extract_eml(content)
    # .txt and anything else: best-effort decode
    return content.decode("utf-8", errors="ignore")


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(content: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)


def _extract_eml(content: bytes) -> str:
    msg = email.message_from_bytes(content, policy=policy.default)
    parts = [f"From: {msg.get('From', '')}", f"Subject: {msg.get('Subject', '')}"]
    body = msg.get_body(preferencelist=("plain", "html"))
    if body:
        parts.append(body.get_content())
    return "\n".join(parts)
