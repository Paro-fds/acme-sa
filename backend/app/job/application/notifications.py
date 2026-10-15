"""US-120 : notifications de l'employé connecté, calculées à partir des postes ouverts et de ses certificats."""

from dataclasses import dataclass
from datetime import datetime

from app.admin.domain.notifications import RETENTION, NotificationReadRepository
from app.certificate.domain.ports import CertificateRepository
from app.job.application.use_cases import EmployeeEligibility, _unit_labels
from app.job.domain.eligibility import missing
from app.job.domain.notifications import EmployeeNotification, certificate_notification, opening_notification, reader_id
from app.job.domain.ports import OpeningRepository
from app.referential.domain.ports import ReferentialRepository
from app.shared.domain.clock import Clock

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


@dataclass(frozen=True)
class MyNotificationView:
    key: str
    kind: str
    kind_label: str
    title: str
    detail: str
    at: datetime
    link: str
    unread: bool


@dataclass(frozen=True)
class MyNotificationsView:
    items: list[MyNotificationView]
    unread_count: int
    has_more: bool


class GetMyNotifications:
    """CA-01 → CA-03, CA-05 : les plus récentes d'abord, sur 90 jours, avec le nombre de non lues."""

    def __init__(
        self,
        openings: OpeningRepository,
        eligibility: EmployeeEligibility,
        referential: ReferentialRepository,
        certificates: CertificateRepository,
        reads: NotificationReadRepository,
        clock: Clock,
    ) -> None:
        self._openings = openings
        self._eligibility = eligibility
        self._referential = referential
        self._certificates = certificates
        self._reads = reads
        self._clock = clock

    def execute(self, employee_id: str, limit: int = DEFAULT_LIMIT) -> MyNotificationsView:
        now = self._clock.now()
        state = self._reads.state(reader_id(employee_id))
        since = now - RETENTION
        notifications = sorted(
            (n for n in self._all(employee_id, now) if since <= n.at <= now),
            key=lambda n: (n.at, n.key),
            reverse=True,
        )
        limit = max(1, min(limit, MAX_LIMIT))
        return MyNotificationsView(
            items=[
                MyNotificationView(
                    n.key, n.kind.value, n.kind.label, n.title, n.detail, n.at, n.link,
                    not state.is_read(n),
                )
                for n in notifications[:limit]
            ],
            unread_count=sum(1 for n in notifications if not state.is_read(n)),
            has_more=len(notifications) > limit,
        )

    def _all(self, employee_id: str, now: datetime) -> list[EmployeeNotification]:
        today = now.date()
        candidate = self._eligibility.candidate(employee_id)
        units = _unit_labels(self._referential)
        found = [
            opening_notification(o, units.get(o.unit_code, o.unit_code))
            for o in self._openings.list_all()
            if self._eligibility.is_open(o, today) and not missing(o.criteria, candidate, today)
        ]
        for certificate in self._certificates.list_for_employee(employee_id):
            notification = certificate_notification(certificate)
            if notification:
                found.append(notification)
        return found
