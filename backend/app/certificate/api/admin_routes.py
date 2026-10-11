"""US-401 & US-402 : API administration pour la file de validation et l'examen unitaire."""

from datetime import date, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from app.auth.api.dependencies import (
    container,
    current_admin,
    current_admin_account,
    require_admin,
    require_not_readonly,
)
from app.auth.domain.admin import AdminAccount
from app.certificate.application.validation_queue import (
    CertificateReviewView,
    QueueItemView,
    ValidationQueueView,
)

router = APIRouter(prefix="/api/admin/validation", tags=["validation"], dependencies=[Depends(current_admin)])


class QueueItemOut(BaseModel):
    certificate_id: str
    employee_id: str
    employee_name: str
    employee_code: str
    agency_code: str
    agency_name: str
    title: str
    certificate_type: str
    certificate_type_label: str
    declared_level: str
    declared_level_label: str
    submitted_at: datetime
    business_days: int
    is_overdue: bool
    status: str
    assigned_to: str | None
    assigned_at: datetime | None


class ValidationQueueOut(BaseModel):
    items: list[QueueItemOut]
    total_waiting: int
    total_overdue: int


@router.get("/queue", response_model=ValidationQueueOut)
def get_queue(
    request: Request,
    agency: str | None = Query(default=None),
    level: str | None = Query(default=None),
    certificate_type: str | None = Query(default=None),
    overdue_only: bool = Query(default=False),
    admin: AdminAccount = Depends(current_admin_account),
) -> ValidationQueueOut:
    view: ValidationQueueView = container(request).get_validation_queue().execute(
        current_admin_username=admin.username,
        agency=agency if agency and agency != "Toutes" else None,
        level=level if level and level != "Tous" else None,
        certificate_type=certificate_type if certificate_type and not certificate_type.startswith("Tous") else None,
        overdue_only=overdue_only,
    )
    return ValidationQueueOut(
        items=[QueueItemOut(**item.__dict__) for item in view.items],
        total_waiting=view.total_waiting,
        total_overdue=view.total_overdue,
    )


@router.post("/claim-next")
def claim_next(
    request: Request,
    admin: AdminAccount = Depends(current_admin_account),
    _: None = Depends(require_not_readonly),
) -> dict:
    cert = container(request).claim_next_certificate().execute(
        admin_username=admin.username, admin_employee_id=admin.employee_id
    )
    if not cert:
        return {"claimed": False, "certificate_id": None}
    return {"claimed": True, "certificate_id": cert.id}


class ReviewEmployeeOut(BaseModel):
    id: str
    employee_code: str
    name: str
    position: str
    agency_name: str
    hire_date: date | None
    is_profile_complete: bool
    declared_level_label: str
    already_validated_certificates: list[str]


class FileInfoOut(BaseModel):
    original_name: str
    content_type: str
    size_bytes: int


class HistoryEntryOut(BaseModel):
    id: int | None
    actor_id: str
    actor_name: str | None
    action: str
    details: str | None
    at: datetime


class CertificateDetailsOut(BaseModel):
    id: str
    employee_id: str
    certificate_type: str
    level: str
    title: str
    institution: str
    year: int
    country: str | None
    domain: str | None
    status: str
    submitted_at: datetime
    assigned_to: str | None
    original_level: str | None
    rejection_reason: str | None
    rejection_comment: str | None


class CertificateReviewOut(BaseModel):
    certificate: CertificateDetailsOut
    employee: ReviewEmployeeOut
    files: list[FileInfoOut]
    history: list[HistoryEntryOut]
    business_days: int


@router.get("/{certificate_id}", response_model=CertificateReviewOut)
def get_review(
    certificate_id: str,
    request: Request,
    admin: AdminAccount = Depends(current_admin_account),
) -> CertificateReviewOut:
    view: CertificateReviewView = container(request).get_certificate_review().execute(
        certificate_id=certificate_id,
        admin_username=admin.username,
    )
    return CertificateReviewOut(
        certificate=CertificateDetailsOut(
            id=view.certificate.id,
            employee_id=view.certificate.employee_id,
            certificate_type=view.certificate.certificate_type,
            level=view.certificate.level,
            title=view.certificate.title,
            institution=view.certificate.institution,
            year=view.certificate.year,
            country=view.certificate.country,
            domain=view.certificate.domain,
            status=view.certificate.status.value,
            submitted_at=view.certificate.submitted_at,
            assigned_to=view.certificate.assigned_to,
            original_level=view.certificate.original_level,
            rejection_reason=view.certificate.rejection_reason,
            rejection_comment=view.certificate.rejection_comment,
        ),
        employee=ReviewEmployeeOut(**view.employee.__dict__),
        files=[
            FileInfoOut(original_name=f.original_name, content_type=f.content_type, size_bytes=f.size_bytes)
            for f in view.files
        ],
        history=[HistoryEntryOut(**h.__dict__) for h in view.history],
        business_days=view.business_days,
    )


@router.get("/{certificate_id}/file")
def get_certificate_file(certificate_id: str, request: Request) -> Response:
    c_container = container(request)
    files = c_container.certificates.files_of(certificate_id)
    if not files:
        return Response(status_code=404)
    file_info = files[0]
    content = c_container.certificate_storage.read(file_info.storage_key)
    return Response(
        content=content,
        media_type=file_info.content_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(file_info.original_name)}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


class CorrectFieldsIn(BaseModel):
    certificate_type: str
    level: str
    title: str
    institution: str
    year: int
    domain: str | None = None
    country: str | None = None


@router.patch("/{certificate_id}/fields")
def correct_fields(
    certificate_id: str,
    body: CorrectFieldsIn,
    request: Request,
    admin: AdminAccount = Depends(current_admin_account),
    _: None = Depends(require_not_readonly),
) -> dict:
    updated = container(request).correct_certificate_fields().execute(
        certificate_id=certificate_id,
        admin_username=admin.username,
        certificate_type=body.certificate_type,
        level=body.level,
        title=body.title,
        institution=body.institution,
        year=body.year,
        domain=body.domain,
        country=body.country,
    )
    return {"updated": True, "level": updated.level, "original_level": updated.original_level}


class AssignIn(BaseModel):
    target_admin: str


@router.post("/{certificate_id}/assign")
def assign_certificate(
    certificate_id: str,
    body: AssignIn,
    request: Request,
    admin: AdminAccount = Depends(current_admin_account),
    _: None = Depends(require_admin),  # CA-04 : Seul l'Administrateur peut réaffecter
) -> dict:
    updated = container(request).assign_certificate().execute(
        certificate_id=certificate_id,
        target_admin_username=body.target_admin,
        acting_admin_username=admin.username,
    )
    return {"assigned_to": updated.assigned_to}


class DecisionIn(BaseModel):
    decision: str  # "VALIDATED" ou "REJECTED"
    reason: str | None = None
    comment: str | None = None


@router.post("/{certificate_id}/decide")
def decide_certificate(
    certificate_id: str,
    body: DecisionIn,
    request: Request,
    admin: AdminAccount = Depends(current_admin_account),
    _: None = Depends(require_not_readonly),
) -> dict:
    updated = container(request).decide_certificate().execute(
        certificate_id=certificate_id,
        admin_username=admin.username,
        decision=body.decision,
        reason=body.reason,
        comment=body.comment,
    )
    return {
        "status": updated.status.value,
        "decided_by": updated.decided_by,
        "rejection_reason": updated.rejection_reason,
    }


class AdminEmployeeCertificateOut(BaseModel):
    id: str
    certificate_type: str
    type_label: str
    level: str
    level_label: str
    title: str
    institution: str
    year: int
    country: str | None
    domain: str | None
    domain_label: str | None
    status: str
    status_label: str
    submitted_at: datetime
    decided_by: str | None
    decided_at: datetime | None
    original_level: str | None
    rejection_reason: str | None
    rejection_comment: str | None
    replaces_id: str | None
    is_archived: bool
    history: list[HistoryEntryOut]
    files: list[FileInfoOut]


@router.get("/employee/{employee_id}/certificates", response_model=list[AdminEmployeeCertificateOut])
def get_employee_certificates(
    employee_id: str,
    request: Request,
) -> list[AdminEmployeeCertificateOut]:
    """US-304 : Retrouver tout certificat validé, même remplacé, avec son historique de décisions complet."""
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
