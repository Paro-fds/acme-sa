"""US-403 : API administration pour le traitement des signalements d'erreur."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.auth.api.dependencies import (
    container,
    current_admin,
    current_admin_account,
    require_not_readonly,
)
from app.auth.domain.admin import AdminAccount
from app.dossier.application.error_reports_queue import ErrorReportItemView, ErrorReportQueueView

router = APIRouter(prefix="/api/admin/reports", tags=["admin-reports"], dependencies=[Depends(current_admin)])


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


@router.post("/{report_id}/decide", response_model=ErrorReportItemOut, dependencies=[Depends(require_not_readonly)])
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
