from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile, status
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.carrieres.domain.pieces import MAX_BYTES

router = APIRouter(prefix="/api/me/pieces", tags=["carrieres"])
EXTENSIONS = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}


class MyPieceOut(BaseModel):
    id: int
    title: str
    type_label: str | None
    status: str
    status_label: str
    document_date: date
    deposited_at: datetime
    refusal_reason: str | None
    has_file: bool


@router.get("", response_model=list[MyPieceOut])
def list_my_pieces(request: Request, employee_id: str = Depends(current_employee_id)) -> list[MyPieceOut]:
    """US-1008 : mes formations de Carrières et mes dépôts à compléter."""
    return [MyPieceOut(**piece.__dict__) for piece in container(request).list_my_pieces().execute(employee_id)]


@router.get("/{piece_id}/file")
def get_my_piece_file(piece_id: int, request: Request, employee_id: str = Depends(current_employee_id)) -> Response:
    """US-1008 : le scan d'une de mes pièces, lu dans Carrières."""
    file = container(request).get_my_piece_file().execute(employee_id, piece_id)
    return Response(
        content=file.content,
        media_type=file.content_type,
        headers={
            "Content-Disposition": f"inline; filename=piece-{piece_id}.{EXTENSIONS.get(file.content_type, 'bin')}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


class DepositedPieceOut(BaseModel):
    id: int
    title: str
    status: str


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DepositedPieceOut)
async def deposit_piece(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(default="", max_length=300),
    employee_id: str = Depends(current_employee_id),
) -> DepositedPieceOut:
    """US-1007 : dépôt d'un scan dans Carrières, au statut « à compléter »."""
    content = await file.read(MAX_BYTES + 1)  # au-delà de 4 Mo, inutile de tout lire
    deposited = container(request).deposit_piece().execute(employee_id, file.filename, content, title)
    return DepositedPieceOut(**deposited.__dict__)
