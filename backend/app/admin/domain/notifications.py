"""US-116 : notifications de l'espace de gestion.

- Une notification n'est pas un document : elle se calcule à partir des certificats, signalements et candidatures ;
  seul l'état « lu » de chaque compte est enregistré.
- Un certificat en attente devient « en retard » au 6e jour ouvrable après son dépôt (règle du tableau de bord,
  US-401) : une seule notification, datée de ce moment.
- Jamais pour ses propres dossiers (RG-42) ; une notification disparaît 90 jours après l'événement.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum
from typing import Protocol

RETENTION = timedelta(days=90)
LATE_AFTER_BUSINESS_DAYS = 5


class NotificationKind(StrEnum):
    CERTIFICATE_SUBMITTED = "CERTIFICATE_SUBMITTED"
    CERTIFICATE_LATE = "CERTIFICATE_LATE"
    ERROR_REPORTED = "ERROR_REPORTED"
    APPLICATION_RECEIVED = "APPLICATION_RECEIVED"

    @property
    def label(self) -> str:
        return _LABELS[self]


_LABELS = {
    NotificationKind.CERTIFICATE_SUBMITTED: "Certificat",
    NotificationKind.CERTIFICATE_LATE: "Retard",
    NotificationKind.ERROR_REPORTED: "Signalement",
    NotificationKind.APPLICATION_RECEIVED: "Candidature",
}


@dataclass(frozen=True)
class Notification:
    key: str
    """Stable : « certificate:<id> », « late:<id> », « report:<id> », « application:<id> »."""
    kind: NotificationKind
    title: str
    detail: str
    at: datetime
    link: str
    subject_employee_id: str


def late_at(submitted_at: datetime) -> datetime:
    """Le moment où le certificat dépasse 5 jours ouvrables : le 6e jour ouvrable après le dépôt, à la même heure."""
    day = submitted_at
    business_days = 0
    while business_days <= LATE_AFTER_BUSINESS_DAYS:
        day += timedelta(days=1)
        if day.weekday() < 5:
            business_days += 1
    return day


def visible(notifications: list[Notification], own_employee_id: str | None, now: datetime) -> list[Notification]:
    """Celles du compte : pas ses propres dossiers, ni plus vieilles que 90 jours ; les plus récentes d'abord."""
    since = now - RETENTION
    kept = [
        n for n in notifications
        if since <= n.at <= now and not (own_employee_id and n.subject_employee_id == own_employee_id)
    ]
    return sorted(kept, key=lambda n: (n.at, n.key), reverse=True)


@dataclass(frozen=True)
class ReadState:
    """Ce qu'un compte a lu : des notifications une à une, et tout ce qui précède son dernier « Tout marquer comme lu »."""

    keys: frozenset[str]
    all_before: datetime | None

    def is_read(self, notification: Notification) -> bool:
        return notification.key in self.keys or (self.all_before is not None and notification.at <= self.all_before)


class NotificationReadRepository(Protocol):
    """État « lu » de chaque compte RH (US-116 CA-04)."""

    def state(self, admin_id: str) -> ReadState: ...

    def mark(self, admin_id: str, key: str, at: datetime) -> None: ...

    def mark_all(self, admin_id: str, at: datetime) -> None:
        """Tout ce qui précède `at` devient lu ; les lectures une à une deviennent inutiles."""
        ...

    def purge(self, before: datetime) -> None:
        """Oublie les lectures antérieures à `before` : leurs notifications ont disparu (90 jours)."""
        ...
