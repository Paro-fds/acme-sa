"""US-403 : API administration pour le traitement des signalements d'erreur."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.auth.api.dependencies import (
    container,
    current_admin,
    current_admin_account,
    require_case_reader,
    require_validator,
)
from app.auth.domain.admin import AdminAccount
from app.dossier.api.routes import DossierOut
from app.dossier.application.error_reports_queue import ErrorReportItemView, ErrorReportQueueView

router = APIRouter(
    prefix="/api/admin/reports", tags=["admin-reports"], dependencies=[Depends(current_admin), Depends(require_case_reader)]
)


class ErrorReportItemOut(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    agency_name: str
    agency_code: str
    field_key: str
    field_label: str
    current_value: str
    indicated_value: str | None
    comment: str | None
    origin: str
    origin_label: str
    at: datetime
    status: str
    status_label: str
    decision: str | None = None
    decided_by: str | None = None
    decided_at: datetime | None = None
    resolution_comment: str | None = None


class ErrorReportQueueOut(BaseModel):
    items: list[ErrorReportItemOut]
    total: int
    new_count: int


class DecideReportIn(BaseModel):
    decision: str
    comment: str | None = None


@router.get("", response_model=ErrorReportQueueOut)
def list_reports(
    request: Request,
    status: str | None = Query(default=None),
    origin: str | None = Query(default=None),
    agency: str | None = Query(default=None),
) -> ErrorReportQueueOut:
    view: ErrorReportQueueView = container(request).get_error_reports_queue().execute(
        status=status,
        origin=origin,
        agency=agency,
    )
    return ErrorReportQueueOut(
        items=[ErrorReportItemOut(**item.__dict__) for item in view.items],
        total=view.total,
        new_count=view.new_count,
    )


@router.post("/{report_id}/decide", response_model=ErrorReportItemOut, dependencies=[Depends(require_validator)])
def decide_report(
    report_id: int,
    payload: DecideReportIn,
    request: Request,
    admin: AdminAccount = Depends(current_admin_account),
) -> ErrorReportItemOut:
    view: ErrorReportItemView = container(request).decide_error_report().execute(
        report_id=report_id,
        admin_id=admin.username,
        decision=payload.decision,
        comment=payload.comment,
    )
    return ErrorReportItemOut(**view.__dict__)


employee_router = APIRouter(prefix="/api/admin/employees", tags=["admin-dossier"], dependencies=[Depends(current_admin)])


class EmployeeReportOut(BaseModel):
    id: int | None
    at: datetime
    field_label: str
    status: str
    status_label: str
    note: str | None


class EmployeeDossierOut(BaseModel):
    dossier: DossierOut
    reports: list[EmployeeReportOut]


@employee_router.get("/{employee_id}/dossier", response_model=EmployeeDossierOut)
def employee_dossier(employee_id: str, request: Request) -> EmployeeDossierOut:
    """US-108 (écran A07) : dossier V2 d'un employé en lecture seule, avec la date de chaque confirmation,
    et ses signalements. La consultation est tracée par `GET /api/admin/employees/{id}`, chargé avec lui."""
    c = container(request)
    return EmployeeDossierOut(
        dossier=DossierOut.of(c.get_my_dossier().execute(employee_id)),
        reports=[EmployeeReportOut(**view.__dict__) for view in c.list_employee_reports().execute(employee_id)],
    )
