from datetime import date, datetime

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_admin, require_admin, require_not_readonly
from app.certificate.api.admin_routes import AdminEmployeeCertificateOut, FileInfoOut, HistoryEntryOut
from app.document.api.schemas import DocumentOut, file_response
from app.update.api.schemas import ChangeOut

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_admin)])


class StatisticsOut(BaseModel):
    total: int
    updated: int
    not_updated: int
    progress: int


class DashboardKPIOut(BaseModel):
    active_employees: int
    complete_folders: int
    complete_folders_percent: int
    target_percent: int
    waiting_certificates: int
    overdue_certificates: int
    rejected_this_month: int


class FolderDistributionOut(BaseModel):
    incomplete_profile_count: int
    incomplete_profile_percent: int
    complete_profile_count: int
    complete_profile_percent: int
    complete_folder_count: int
    complete_folder_percent: int


class ToProcessCountsOut(BaseModel):
    overdue_certificates: int
    error_reports: int
    to_attach: int


class UnitBreakdownItemOut(BaseModel):
    unit_code: str
    unit_label: str
    unit_type: str
    employees_count: int
    complete_folders_percent: int
    received_certificates: int
    waiting_certificates: int
    rejected_certificates: int


class DashboardOut(BaseModel):
    kpi: DashboardKPIOut
    distribution: FolderDistributionOut
    to_process: ToProcessCountsOut
    by_agency: list[UnitBreakdownItemOut]
    by_region: list[UnitBreakdownItemOut]
    by_direction: list[UnitBreakdownItemOut]


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


@router.get("/dashboard", response_model=DashboardOut)
def pilot_dashboard(request: Request) -> DashboardOut:
    view = container(request).get_pilot_dashboard().execute()
    return DashboardOut(
        kpi=DashboardKPIOut(**view.kpi.__dict__),
        distribution=FolderDistributionOut(**view.distribution.__dict__),
        to_process=ToProcessCountsOut(**view.to_process.__dict__),
        by_agency=[UnitBreakdownItemOut(**item.__dict__) for item in view.by_agency],
        by_region=[UnitBreakdownItemOut(**item.__dict__) for item in view.by_region],
        by_direction=[UnitBreakdownItemOut(**item.__dict__) for item in view.by_direction],
    )


class MenuCountsOut(BaseModel):
    validation: int
    reports: int
    to_attach: int


@router.get("/menu-counts", response_model=MenuCountsOut)
def menu_counts(request: Request) -> MenuCountsOut:
    """US-108 CA-02 : compteurs réels du menu de l'espace RH."""
    return MenuCountsOut(**container(request).get_menu_counts().execute().__dict__)


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


class QualifiedEmployeeItemOut(BaseModel):
    id: str
    employee_code: str
    last_name: str
    first_name: str
    display_name: str
    agency_code: str
    agency_name: str
    region_code: str
    region_name: str
    direction_code: str
    direction_name: str
    position: str
    folder_status: str
    folder_status_label: str
    validated_level: str | None
    validated_level_label: str | None
    validated_rank: int | None
    validated_domain: str | None
    validated_domain_label: str | None
    updated_at: datetime | None


class QualifiedEmployeesSearchResultOut(BaseModel):
    items: list[QualifiedEmployeeItemOut]
    total: int
    page: int
    page_size: int
    page_count: int


@router.get("/employees/search", response_model=QualifiedEmployeesSearchResultOut)
def search_qualified_employees(
    request: Request,
    search: str = Query("", max_length=100),
    agency: str = Query("", max_length=100),
    region: str = Query("", max_length=100),
    direction: str = Query("", max_length=100),
    folder_status: str = Query("", max_length=100),
    min_level: str = Query("", max_length=100),
    domain: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> QualifiedEmployeesSearchResultOut:
    """US-602 : Recherche multi-critères d'employés qualifiés (Écran A06) ; US-108 : liste paginée comme A06."""
    result = container(request).search_qualified_employees().execute(
        search=search or None,
        agency=agency or None,
        region=region or None,
        direction=direction or None,
        folder_status=folder_status or None,
        min_level=min_level or None,
        domain=domain or None,
    )
    page_count = max(1, -(-result.total // page_size))
    start = (min(page, page_count) - 1) * page_size
    return QualifiedEmployeesSearchResultOut(
        items=[QualifiedEmployeeItemOut(**item.__dict__) for item in result.items[start : start + page_size]],
        total=result.total,
        page=min(page, page_count),
        page_size=page_size,
        page_count=page_count,
    )


@router.get("/employees/export")
def export_employees(
    request: Request,
    admin_id: str = Depends(require_admin),
    search: str = Query("", max_length=100),
    agency: str = Query("", max_length=100),
    region: str = Query("", max_length=100),
    direction: str = Query("", max_length=100),
    folder_status: str = Query("", max_length=100),
    min_level: str = Query("", max_length=100),
    domain: str = Query("", max_length=100),
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
) -> Response:
    """US-603 : Export Excel / CSV de la liste filtrée. D-18 : réservé à l'Administrateur seul, tracé dans audit_log."""
    export_result = container(request).export_employees_list().execute(
        actor_id=admin_id,
        search=search or None,
        agency=agency or None,
        region=region or None,
        direction=direction or None,
        folder_status=folder_status or None,
        min_level=min_level or None,
        domain=domain or None,
        export_format=format,
    )
    return Response(
        content=export_result.content,
        media_type=export_result.media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{export_result.filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/employees/{employee_id}", response_model=EmployeeFolderOut)
def get_employee_folder(
    employee_id: str, request: Request, admin_id: str = Depends(current_admin)
) -> EmployeeFolderOut:
    """Consultation du dossier d'un employé. US-602 CA-04 : tracée dans le journal d'audit."""
    folder = container(request).get_employee_folder().execute(employee_id)
    container(request).record_dossier_consultation().execute(actor_id=admin_id, employee_id=employee_id)
    fields = {key: value for key, value in folder.__dict__.items() if key != "changes"}
    return EmployeeFolderOut(**fields, changes=[ChangeOut(**change.__dict__) for change in folder.changes])


@router.get("/employees/{employee_id}/documents", response_model=list[DocumentOut])
def list_employee_documents(employee_id: str, request: Request) -> list[DocumentOut]:
    return [DocumentOut.of(view) for view in container(request).list_employee_documents().execute(employee_id)]


@router.get("/employees/{employee_id}/certificates", response_model=list[AdminEmployeeCertificateOut])
def list_employee_certificates(employee_id: str, request: Request) -> list[AdminEmployeeCertificateOut]:
    """US-304 : Retrouver tout certificat validé, même remplacé, avec son historique de décisions."""
    views = container(request).get_employee_certificates_for_admin().execute(employee_id)
    return [
        AdminEmployeeCertificateOut(
            id=v.id,
            certificate_type=v.certificate_type,
            type_label=v.type_label,
            level=v.level,
            level_label=v.level_label,
            title=v.title,
            institution=v.institution,
            year=v.year,
            country=v.country,
            domain=v.domain,
            domain_label=v.domain_label,
            status=v.status,
            status_label=v.status_label,
            submitted_at=v.submitted_at,
            decided_by=v.decided_by,
            decided_at=v.decided_at,
            original_level=v.original_level,
            rejection_reason=v.rejection_reason,
            rejection_comment=v.rejection_comment,
            replaces_id=v.replaces_id,
            is_archived=v.is_archived,
            history=[HistoryEntryOut(**h.__dict__) for h in v.history],
            files=[
                FileInfoOut(original_name=f.original_name, content_type=f.content_type, size_bytes=f.size_bytes)
                for f in v.files
            ],
        )
        for v in views
    ]


@router.get("/documents/{document_id}/file")
def get_employee_document_file(document_id: str, request: Request) -> Response:
    return file_response(container(request).get_employee_document_file().execute(document_id))


@router.post("/employees/{employee_id}/reset-access", status_code=204, dependencies=[Depends(require_not_readonly)])
def reset_access(employee_id: str, request: Request, admin_id: str = Depends(current_admin)) -> None:
    """US-22 : réinitialiser l'accès ; US-103 CA-01 : refusé en lecture seule ; US-104 CA-03 : tracé."""
    container(request).reset_access().execute(employee_id, actor_id=admin_id)


class RatingCountOut(BaseModel):
    rating: int
    label: str
    count: int


class EngagementOut(BaseModel):
    """US-605 : des nombres seulement, jamais de commentaire ni de nom."""

    logins_30_days: int
    employees_30_days: int
    active_employees: int
    feedback: list[RatingCountOut]


@router.get("/engagement", response_model=EngagementOut)
def engagement(request: Request) -> EngagementOut:
    result = container(request).get_engagement().execute()
    return EngagementOut(
        logins_30_days=result.logins_30_days,
        employees_30_days=result.employees_30_days,
        active_employees=result.active_employees,
        feedback=[RatingCountOut(**item.__dict__) for item in result.feedback],
    )


class AuditLogItemOut(BaseModel):
    id: int
    at: datetime
    actor_id: str
    actor_name: str
    action: str
    action_label: str
    target_id: str
    target_name: str
    details: str | None


class AuditLogOut(BaseModel):
    items: list[AuditLogItemOut]
    total: int
    page: int
    page_size: int
    page_count: int
    actors: list[str]
    actions: list[str]


@router.get("/audit", response_model=AuditLogOut)
def get_audit_log(
    request: Request,
    actor: str = Query("", max_length=100),
    target: str = Query("", max_length=100),
    action: str = Query("", max_length=100),
    period: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> AuditLogOut:
    """US-604 : Journal d'audit des actions RH (consultation seule, sans modification ni suppression)."""
    view = container(request).get_audit_log().execute(
        actor=actor or None,
        target=target or None,
        action=action or None,
        period=period or None,
        page=page,
        page_size=page_size,
    )
    return AuditLogOut(
        items=[AuditLogItemOut(**item.__dict__) for item in view.items],
        total=view.total,
        page=view.page,
        page_size=view.page_size,
        page_count=view.page_count,
        actors=view.actors,
        actions=view.actions,
    )

