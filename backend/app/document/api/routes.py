from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.document.application.use_cases import DocumentView

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
