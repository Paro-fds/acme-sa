"""US-401 & US-402 : File de validation et examen unitaire des certificats (EF-401 -> EF-407, RG-40 -> RG-46)."""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Protocol

from app.certificate.domain.certificate import (
    LEVEL_LABELS,
    REJECTION_REASONS,
    TYPE_LABELS,
    Certificate,
    CertificateFile,
    CertificateHistoryEntry,
    CertificateStatus,
)
from app.certificate.domain.errors import InvalidCertificateField
from app.employee.domain.employee import Employee
from app.shared.domain.clock import Clock


def count_business_days(start: datetime, end: datetime) -> int:
    """Calcule le nombre de jours ouvrables (du lundi au vendredi) entre start et end."""
    start_date = start.date() if isinstance(start, datetime) else start
    end_date = end.date() if isinstance(end, datetime) else end
    if end_date <= start_date:
        return 0
    days = 0
    current = start_date
    while current < end_date:
        current += timedelta(days=1)
        if current.weekday() < 5:
            days += 1
    return days


@dataclass(frozen=True)
class QueueItemView:
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


@dataclass(frozen=True)
class ValidationQueueView:
    items: list[QueueItemView]
    total_waiting: int
    total_overdue: int


class CertificateRepository(Protocol):
    def list_queue(self, exclude_employee_id: str | None = None) -> list[Certificate]: ...
    def get(self, certificate_id: str) -> Certificate | None: ...
    def update(self, certificate: Certificate) -> None: ...
    def add_history(self, entry: CertificateHistoryEntry) -> None: ...
    def history_of(self, certificate_id: str) -> list[CertificateHistoryEntry]: ...
    def files_of(self, certificate_id: str) -> list[CertificateFile]: ...
    def list_for_employee(self, employee_id: str) -> list[Certificate]: ...


class EmployeeRepository(Protocol):
    def get(self, employee_id: str) -> Employee | None: ...
    def list_all(self) -> list[Employee]: ...


class ReferentialRepository(Protocol):
    def units(self) -> dict[str, Any]: ...


class GetValidationQueue:
    def __init__(
        self,
        certificates: CertificateRepository,
        employees: EmployeeRepository,
        referential: ReferentialRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._employees = employees
        self._referential = referential
        self._clock = clock

    def execute(
        self,
        current_admin_username: str,
        current_admin_employee_id: str | None = None,
        agency: str | None = None,
        level: str | None = None,
        certificate_type: str | None = None,
        overdue_only: bool = False,
    ) -> ValidationQueueView:
        now = self._clock.now()
        # CA-03 : Mon propre certificat n'apparaît jamais dans ma file
        raw_items = self._certificates.list_queue(exclude_employee_id=current_admin_employee_id)
        employees_by_id = {e.id: e for e in self._employees.list_all()}
        units = self._referential.units()

        queue_items: list[QueueItemView] = []
        total_waiting = len(raw_items)
        total_overdue = 0

        for cert in raw_items:
            emp = employees_by_id.get(cert.employee_id)
            emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Employé inconnu"
            emp_code = emp.employee_code if emp else cert.employee_id
            agency_code = emp.agency_code if emp else ""
            unit = units.get(agency_code)
            agency_name = unit.label if unit else agency_code

            b_days = count_business_days(cert.submitted_at, now)
            is_overdue = b_days > 5
            if is_overdue:
                total_overdue += 1

            # Filtrage
            if agency and agency_name != agency and agency_code != agency:
                continue
            if level and cert.level != level:
                continue
            if certificate_type and cert.certificate_type != certificate_type:
                continue
            if overdue_only and not is_overdue:
                continue

            queue_items.append(
                QueueItemView(
                    certificate_id=cert.id,
                    employee_id=cert.employee_id,
                    employee_name=emp_name,
                    employee_code=emp_code,
                    agency_code=agency_code,
                    agency_name=agency_name,
                    title=cert.title,
                    certificate_type=cert.certificate_type,
                    certificate_type_label=TYPE_LABELS.get(cert.certificate_type, cert.certificate_type),
                    declared_level=cert.level,
                    declared_level_label=LEVEL_LABELS.get(cert.level, cert.level),
                    submitted_at=cert.submitted_at,
                    business_days=b_days,
                    is_overdue=is_overdue,
                    status=cert.status.value,
                    assigned_to=cert.assigned_to,
                    assigned_at=cert.assigned_at,
                )
            )

        return ValidationQueueView(
            items=queue_items,
            total_waiting=total_waiting,
            total_overdue=total_overdue,
        )


class ClaimNextCertificate:
    """CA-02 : Prendre le certificat suivant dans la file commune."""

    def __init__(
        self,
        certificates: CertificateRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._clock = clock

    def execute(self, admin_username: str, admin_employee_id: str | None = None) -> Certificate | None:
        now = self._clock.now()
        queue = self._certificates.list_queue(exclude_employee_id=admin_employee_id)
        if not queue:
            return None

        # Chercher le premier certificat non assigné, ou déjà assigné à soi
        chosen = None
        for cert in queue:
            if not cert.assigned_to or cert.assigned_to == admin_username:
                chosen = cert
                break

        if not chosen:
            # S'ils sont tous assignés à d'autres, prendre le plus ancien
            chosen = queue[0]

        updated = Certificate(
            id=chosen.id,
            employee_id=chosen.employee_id,
            certificate_type=chosen.certificate_type,
            level=chosen.level,
            title=chosen.title,
            institution=chosen.institution,
            year=chosen.year,
            country=chosen.country,
            domain=chosen.domain,
            domain_other=chosen.domain_other,
            status=CertificateStatus.IN_REVIEW,
            submitted_at=chosen.submitted_at,
            assigned_to=admin_username,
            assigned_at=now,
            decided_by=chosen.decided_by,
            decided_at=chosen.decided_at,
            rejection_reason=chosen.rejection_reason,
            rejection_comment=chosen.rejection_comment,
            original_level=chosen.original_level,
        )
        self._certificates.update(updated)
        self._certificates.add_history(
            CertificateHistoryEntry(
                id=None,
                certificate_id=chosen.id,
                actor_id=admin_username,
                actor_name=admin_username,
                action="CLAIMED",
                details=f"Pris en charge par {admin_username}",
                at=now,
            )
        )
        return updated


class AssignCertificate:
    """CA-04 : Un Administrateur peut réaffecter un dossier à un autre valideur."""

    def __init__(
        self,
        certificates: CertificateRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._clock = clock

    def execute(self, certificate_id: str, target_admin_username: str, acting_admin_username: str) -> Certificate:
        cert = self._certificates.get(certificate_id)
        if not cert:
            raise InvalidCertificateField("Certificat introuvable.", field="certificate_id")

        now = self._clock.now()
        updated = Certificate(
            id=cert.id,
            employee_id=cert.employee_id,
            certificate_type=cert.certificate_type,
            level=cert.level,
            title=cert.title,
            institution=cert.institution,
            year=cert.year,
            country=cert.country,
            domain=cert.domain,
            domain_other=cert.domain_other,
            status=CertificateStatus.IN_REVIEW,
            submitted_at=cert.submitted_at,
            assigned_to=target_admin_username,
            assigned_at=now,
            decided_by=cert.decided_by,
            decided_at=cert.decided_at,
            rejection_reason=cert.rejection_reason,
            rejection_comment=cert.rejection_comment,
            original_level=cert.original_level,
        )
        self._certificates.update(updated)
        self._certificates.add_history(
            CertificateHistoryEntry(
                id=None,
                certificate_id=cert.id,
                actor_id=acting_admin_username,
                actor_name=acting_admin_username,
                action="REASSIGNED",
                details=f"Réaffecté à {target_admin_username} par {acting_admin_username}",
                at=now,
            )
        )
        return updated


@dataclass(frozen=True)
class ReviewEmployeeView:
    id: str
    employee_code: str
    name: str
    position: str
    agency_name: str
    hire_date: date | None
    is_profile_complete: bool
    declared_level_label: str
    already_validated_certificates: list[str]


@dataclass(frozen=True)
class CertificateReviewView:
    certificate: Certificate
    employee: ReviewEmployeeView
    files: list[CertificateFile]
    history: list[CertificateHistoryEntry]
    business_days: int


class GetCertificateReview:
    """US-402 : Vue détaillée pour l'écran d'examen A04."""

    def __init__(
        self,
        certificates: CertificateRepository,
        employees: EmployeeRepository,
        referential: ReferentialRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._employees = employees
        self._referential = referential
        self._clock = clock

    def execute(self, certificate_id: str, admin_username: str) -> CertificateReviewView:
        cert = self._certificates.get(certificate_id)
        if not cert:
            raise InvalidCertificateField("Certificat introuvable.", field="certificate_id")

        now = self._clock.now()

        # Si pas encore assigné ou en cours, assigner automatiquement au valideur qui l'ouvre
        if not cert.assigned_to or cert.status == CertificateStatus.RECEIVED:
            cert = Certificate(
                id=cert.id,
                employee_id=cert.employee_id,
                certificate_type=cert.certificate_type,
                level=cert.level,
                title=cert.title,
                institution=cert.institution,
                year=cert.year,
                country=cert.country,
                domain=cert.domain,
                domain_other=cert.domain_other,
                status=CertificateStatus.IN_REVIEW,
                submitted_at=cert.submitted_at,
                assigned_to=cert.assigned_to or admin_username,
                assigned_at=cert.assigned_at or now,
                decided_by=cert.decided_by,
                decided_at=cert.decided_at,
                rejection_reason=cert.rejection_reason,
                rejection_comment=cert.rejection_comment,
                original_level=cert.original_level,
            )
            self._certificates.update(cert)
            self._certificates.add_history(
                CertificateHistoryEntry(
                    id=None,
                    certificate_id=cert.id,
                    actor_id=admin_username,
                    actor_name=admin_username,
                    action="CLAIMED",
                    details=f"Pris en charge par {admin_username}",
                    at=now,
                )
            )

        emp = self._employees.get(cert.employee_id)
        emp_name = f"{emp.first_name} {emp.last_name}" if emp else "Employé inconnu"
        emp_code = emp.employee_code if emp else cert.employee_id
        position = emp.position if emp else ""
        units = self._referential.units()
        unit = units.get(emp.agency_code) if emp else None
        agency_name = unit.label if unit else (emp.agency_code if emp else "")

        all_emp_certs = self._certificates.list_for_employee(cert.employee_id)
        validated_titles = [
            f"{c.title} ({c.year})"
            for c in all_emp_certs
            if c.status == CertificateStatus.VALIDATED and c.id != cert.id
        ]

        files = self._certificates.files_of(cert.id)
        history = self._certificates.history_of(cert.id)
        b_days = count_business_days(cert.submitted_at, now)

        emp_view = ReviewEmployeeView(
            id=cert.employee_id,
            employee_code=emp_code,
            name=emp_name,
            position=position,
            agency_name=agency_name,
            hire_date=emp.hire_date if emp else None,
            is_profile_complete=True,
            declared_level_label=LEVEL_LABELS.get(cert.level, cert.level),
            already_validated_certificates=validated_titles,
        )

        return CertificateReviewView(
            certificate=cert,
            employee=emp_view,
            files=files,
            history=history,
            business_days=b_days,
        )


class CorrectCertificateFields:
    """CA-02 : L'agent RH peut corriger le niveau, l'intitulé, l'établissement, l'année, le domaine."""

    def __init__(
        self,
        certificates: CertificateRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._clock = clock

    def execute(
        self,
        certificate_id: str,
        admin_username: str,
        certificate_type: str,
        level: str,
        title: str,
        institution: str,
        year: int,
        domain: str | None = None,
        country: str | None = None,
    ) -> Certificate:
        cert = self._certificates.get(certificate_id)
        if not cert:
            raise InvalidCertificateField("Certificat introuvable.", field="certificate_id")

        now = self._clock.now()
        original_level = cert.original_level or (cert.level if cert.level != level else None)

        corrections: list[str] = []
        if cert.level != level:
            corrections.append(f"Niveau : {LEVEL_LABELS.get(cert.level, cert.level)} → {LEVEL_LABELS.get(level, level)}")
        if cert.title != title:
            corrections.append(f"Intitulé corrigé : {title}")
        if cert.year != year:
            corrections.append(f"Année : {cert.year} → {year}")

        updated = Certificate(
            id=cert.id,
            employee_id=cert.employee_id,
            certificate_type=certificate_type,
            level=level,
            title=title,
            institution=institution,
            year=year,
            country=country,
            domain=domain,
            domain_other=cert.domain_other,
            status=cert.status,
            submitted_at=cert.submitted_at,
            assigned_to=cert.assigned_to or admin_username,
            assigned_at=cert.assigned_at or now,
            decided_by=cert.decided_by,
            decided_at=cert.decided_at,
            rejection_reason=cert.rejection_reason,
            rejection_comment=cert.rejection_comment,
            original_level=original_level,
        )
        self._certificates.update(updated)

        if corrections:
            self._certificates.add_history(
                CertificateHistoryEntry(
                    id=None,
                    certificate_id=cert.id,
                    actor_id=admin_username,
                    actor_name=admin_username,
                    action="CORRECTED",
                    details=f"Modifié par {admin_username} : {', '.join(corrections)}",
                    at=now,
                )
            )

        return updated


class DecideCertificate:
    """CA-01, CA-03 : Valider ou rejeter avec motif officiel et traçabilité."""

    def __init__(
        self,
        certificates: CertificateRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._clock = clock

    def execute(
        self,
        certificate_id: str,
        admin_username: str,
        decision: str,  # 'VALIDATED' ou 'REJECTED'
        reason: str | None = None,
        comment: str | None = None,
    ) -> Certificate:
        cert = self._certificates.get(certificate_id)
        if not cert:
            raise InvalidCertificateField("Certificat introuvable.", field="certificate_id")

        now = self._clock.now()

        if decision == "VALIDATED":
            status = CertificateStatus.VALIDATED
            rejection_reason = None
            rejection_comment = None
            history_action = "VALIDATED"
            history_details = f"Validé par {admin_username}"
        elif decision in ("REJECTED", "TO_CORRECT"):
            status = CertificateStatus.TO_CORRECT
            if not reason:
                raise InvalidCertificateField("Choisissez un motif de rejet.", field="reason")
            if reason == "Autre" and (not comment or not comment.strip()):
                raise InvalidCertificateField("Le commentaire est obligatoire pour le motif « Autre ».", field="comment")
            rejection_reason = reason
            rejection_comment = comment.strip() if comment else None
            history_action = "REJECTED"
            history_details = f"Rejeté par {admin_username} — Motif : {reason}" + (f" ({comment})" if comment else "")
        else:
            raise InvalidCertificateField("Décision inconnue.", field="decision")

        updated = Certificate(
            id=cert.id,
            employee_id=cert.employee_id,
            certificate_type=cert.certificate_type,
            level=cert.level,
            title=cert.title,
            institution=cert.institution,
            year=cert.year,
            country=cert.country,
            domain=cert.domain,
            domain_other=cert.domain_other,
            status=status,
            submitted_at=cert.submitted_at,
            assigned_to=cert.assigned_to or admin_username,
            assigned_at=cert.assigned_at or now,
            decided_by=admin_username,
            decided_at=now,
            rejection_reason=rejection_reason,
            rejection_comment=rejection_comment,
            original_level=cert.original_level,
        )
        self._certificates.update(updated)
        self._certificates.add_history(
            CertificateHistoryEntry(
                id=None,
                certificate_id=cert.id,
                actor_id=admin_username,
                actor_name=admin_username,
                action=history_action,
                details=history_details,
                at=now,
            )
        )
        return updated
