from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.document.application.use_cases import DocumentFile, DocumentView

router = APIRouter(prefix="/api/me/documents", tags=["documents"])


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


@router.get("", response_model=list[DocumentOut])
def list_my_documents(request: Request, employee_id: str = Depends(current_employee_id)) -> list[DocumentOut]:
    return [DocumentOut.of(view) for view in container(request).list_my_documents().execute(employee_id)]


@router.post("", status_code=201, response_model=DocumentOut)
def upload_document(
    request: Request,
    file: UploadFile = File(),
    document_type: str | None = Form(None),
    employee_id: str = Depends(current_employee_id),
) -> DocumentOut:
    max_bytes = container(request).settings.max_upload_mb * 1024 * 1024
    # Un octet de plus que la limite suffit pour savoir que le fichier est trop lourd.
    content = file.file.read(max_bytes + 1)
    view = container(request).upload_document().execute(employee_id, document_type, file.filename, content)
    return DocumentOut.of(view)


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: str, request: Request, employee_id: str = Depends(current_employee_id)) -> None:
    container(request).delete_document().execute(employee_id, document_id)


@router.get("/{document_id}/file")
def get_document_file(document_id: str, request: Request, employee_id: str = Depends(current_employee_id)) -> Response:
    return file_response(container(request).get_my_document_file().execute(employee_id, document_id))
