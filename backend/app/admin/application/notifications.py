"""US-116 : notifications de l'espace de gestion, calculées à partir des certificats, signalements et candidatures."""

from dataclasses import dataclass
from datetime import datetime

from app.admin.domain.notifications import (
    RETENTION,
    Notification,
    NotificationKind,
    NotificationReadRepository,
    late_at,
    visible,
)
from app.certificate.domain.certificate import Certificate, CertificateStatus
from app.certificate.domain.ports import CertificateRepository
from app.dossier.domain.hr_information import LABELS, HrItem, ReportOrigin
from app.dossier.domain.ports import DossierRepository
from app.employee.domain.repository import EmployeeRepository
from app.job.domain.ports import ApplicationRepository, OpeningRepository
from app.shared.domain.clock import Clock

_WAITING = (CertificateStatus.RECEIVED, CertificateStatus.IN_REVIEW)
DEFAULT_LIMIT = 50
MAX_LIMIT = 200


def _information_label(key: str) -> str:
    """« Date d'embauche » pour « hire_date_confirmed » ; une clé inconnue reste telle quelle."""
    try:
        return LABELS[HrItem(key)]
    except ValueError:
        return key


@dataclass(frozen=True)
class NotificationView:
    key: str
    kind: str
    kind_label: str
    title: str
    detail: str
    at: datetime
    link: str
    unread: bool


@dataclass(frozen=True)
class NotificationsView:
    items: list[NotificationView]
    unread_count: int
    has_more: bool


class GetNotifications:
    """CA-01 → CA-05 : les notifications d'un compte RH, les plus récentes d'abord, avec le nombre de non lues."""

    def __init__(
        self,
        certificates: CertificateRepository,
        dossiers: DossierRepository,
        openings: OpeningRepository,
        applications: ApplicationRepository,
        employees: EmployeeRepository,
        reads: NotificationReadRepository,
        clock: Clock,
    ) -> None:
        self._certificates = certificates
        self._dossiers = dossiers
        self._openings = openings
        self._applications = applications
        self._employees = employees
        self._reads = reads
        self._clock = clock

    def execute(
        self, admin_id: str, own_employee_id: str | None, kind: str | None = None, limit: int = DEFAULT_LIMIT
    ) -> NotificationsView:
        now = self._clock.now()
        state = self._reads.state(admin_id)
        notifications = visible(self._all(now), own_employee_id, now)
        unread_count = sum(1 for n in notifications if not state.is_read(n))
        if kind:
            notifications = [n for n in notifications if n.kind == kind]
        limit = max(1, min(limit, MAX_LIMIT))
        return NotificationsView(
            items=[
                NotificationView(n.key, n.kind.value, n.kind.label, n.title, n.detail, n.at, n.link, not state.is_read(n))
                for n in notifications[:limit]
            ],
            unread_count=unread_count,
            has_more=len(notifications) > limit,
        )

    def _name(self, employee_id: str) -> str:
        employee = self._employees.get(employee_id)
        return f"{employee.first_name} {employee.last_name}" if employee else "Un employé"

    def _all(self, now: datetime) -> list[Notification]:
        since = now - RETENTION
        notifications: list[Notification] = []
        for certificate in self._certificates.list_all():
            notifications.extend(self._certificate(certificate, now))
        for report in self._dossiers.list_all_reports():
            if report.origin is not ReportOrigin.EMPLOYEE or report.at < since:
                continue
            notifications.append(
                Notification(
                    f"report:{report.id}", NotificationKind.ERROR_REPORTED, f"{self._name(report.employee_id)} signale une erreur",
                    _information_label(report.information),
                    report.at, "/admin/signalements", report.employee_id,
                )
            )
        for opening in self._openings.list_all():
            for application in self._applications.for_opening(opening.id):
                if application.received_at < since:
                    continue
                notifications.append(
                    Notification(
                        f"application:{application.id}", NotificationKind.APPLICATION_RECEIVED,
                        f"{self._name(application.employee_id)} a postulé", f"{opening.title} · {opening.code}",
                        application.received_at, f"/admin/postes/{opening.id}", application.employee_id,
                    )
                )
        return notifications

    def _certificate(self, certificate: Certificate, now: datetime) -> list[Notification]:
        name = self._name(certificate.employee_id)
        link = f"/admin/validation/{certificate.id}"
        found = [
            Notification(
                f"certificate:{certificate.id}", NotificationKind.CERTIFICATE_SUBMITTED, f"{name} a déposé un certificat",
                certificate.title, certificate.submitted_at, link, certificate.employee_id,
            )
        ]
        # Le retard : un certificat encore en attente, ou traité après avoir dépassé 5 jours ouvrables.
        if certificate.status in _WAITING and not certificate.is_archived:
            end = now
        else:
            end = certificate.decided_at
        moment = late_at(certificate.submitted_at)
        if end is not None and moment <= end:
            found.append(
                Notification(
                    f"late:{certificate.id}", NotificationKind.CERTIFICATE_LATE,
                    "Certificat en retard : plus de 5 jours ouvrables", f"{name} · {certificate.title}", moment, link,
                    certificate.employee_id,
                )
            )
        return found


class MarkNotificationRead:
    """CA-04 : une notification ouverte devient lue pour ce compte seulement."""

    def __init__(self, reads: NotificationReadRepository, clock: Clock) -> None:
        self._reads = reads
        self._clock = clock

    def execute(self, admin_id: str, key: str) -> None:
        now = self._clock.now()
        self._reads.mark(admin_id, key, now)
        self._reads.purge(now - RETENTION)


class MarkAllNotificationsRead:
    """CA-04 : « Tout marquer comme lu »."""

    def __init__(self, reads: NotificationReadRepository, clock: Clock) -> None:
        self._reads = reads
        self._clock = clock

    def execute(self, admin_id: str) -> None:
        now = self._clock.now()
        self._reads.mark_all(admin_id, now)
        self._reads.purge(now - RETENTION)
