from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_admin
from app.document.api.routes import DocumentOut, file_response
from app.update.api.routes import ChangeOut

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_admin)])


class StatisticsOut(BaseModel):
    total: int
    updated: int
    not_updated: int
    progress: int


class EmployeeListItemOut(BaseModel):
    id: str
    employee_code: str
    last_name: str
    first_name: str
    display_name: str
    previous_name: str | None
    agency_code: str
    position: str
    status: str


class StatusCountsOut(BaseModel):
    all: int
    updated: int
    not_updated: int


class EmployeePageOut(BaseModel):
    items: list[EmployeeListItemOut]
    total: int
    page: int
    page_size: int
    page_count: int
    counts: StatusCountsOut


class EmployeeFolderOut(BaseModel):
    """Liste explicite des champs exposés : aucune colonne exclue de la source ne peut sortir (ENF-07)."""

    id: str
    employee_code: str
    last_name: str
    first_name: str
    display_name: str
    previous_name: str | None
    gender: str
    birth_date: date
    telephone_number: str
    email_address: str
    address_line_1: str
    agency_code: str
    department: str
    position: str
    grade: str
    level: str
    contract_nature: str
    hire_date: date | None
    status: str
    submitted_at: datetime | None
    declined: bool
    changes: list[ChangeOut]
    account_activated: bool


@router.get("/statistics", response_model=StatisticsOut)
def statistics(request: Request) -> StatisticsOut:
    result = container(request).get_statistics().execute()
    return StatisticsOut(
        total=result.total, updated=result.updated, not_updated=result.not_updated, progress=result.progress
    )


@router.get("/employees", response_model=EmployeePageOut)
def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", pattern="^(UPDATED|NOT_UPDATED)?$"),
) -> EmployeePageOut:
    result = container(request).list_employees().execute(
        page=page, page_size=page_size, search=search, status=status or None
    )
    return EmployeePageOut(
        items=[EmployeeListItemOut(**item.__dict__) for item in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        page_count=result.page_count,
        counts=StatusCountsOut(**result.counts.__dict__),
    )


@router.get("/employees/{employee_id}", response_model=EmployeeFolderOut)
def get_employee_folder(employee_id: str, request: Request) -> EmployeeFolderOut:
    folder = container(request).get_employee_folder().execute(employee_id)
    fields = {key: value for key, value in folder.__dict__.items() if key != "changes"}
    return EmployeeFolderOut(**fields, changes=[ChangeOut(**change.__dict__) for change in folder.changes])


@router.get("/employees/{employee_id}/documents", response_model=list[DocumentOut])
def list_employee_documents(employee_id: str, request: Request) -> list[DocumentOut]:
    return [DocumentOut.of(view) for view in container(request).list_employee_documents().execute(employee_id)]


@router.get("/documents/{document_id}/file")
def get_employee_document_file(document_id: str, request: Request) -> Response:
    return file_response(container(request).get_employee_document_file().execute(document_id))


@router.post("/employees/{employee_id}/reset-access", status_code=204)
def reset_access(employee_id: str, request: Request) -> None:
    """US-22 : seule route d'écriture de l'administration."""
    container(request).reset_access().execute(employee_id)
