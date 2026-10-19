"""Schémas des documents du MVP, encore lus par les écrans RH (code hérité, US-206)."""

from datetime import datetime
from urllib.parse import quote

from fastapi import Response
from pydantic import BaseModel

from app.document.application.use_cases import DocumentFile, DocumentView


class DocumentOut(BaseModel):
    id: str
    document_type: str
    type_label: str
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime

    @classmethod
    def of(cls, view: DocumentView) -> "DocumentOut":
        return cls(**view.__dict__)


def file_response(document: DocumentFile) -> Response:
    return Response(
        content=document.content,
        media_type=document.content_type,
        headers={
            # Affiché dans le navigateur (aperçu d'image, lecteur PDF) ; nom d'origine encodé (RFC 5987).
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(document.original_name)}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
