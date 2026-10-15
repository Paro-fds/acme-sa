"""US-120 : notifications de l'employé dans le portail.

- Comme celles des RH (US-116), elles se calculent ; seul l'état « lu » de chaque employé est enregistré.
- « Nouveau poste ouvert pour vous » : un poste publié et ouvert dont l'employé remplit tous les critères, même s'il
  devient apte après la publication ; datée de la publication (ou de l'ouverture si elle vient après).
- « Certificat validé » / « Certificat à corriger » : une par décision des RH, datée de la décision.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, time
from enum import StrEnum

from app.certificate.domain.certificate import Certificate, CertificateStatus
from app.job.domain.opening import JobOpening, OpeningStatus

CAREER_LINK = "/carriere"
CERTIFICATES_LINK = "/certificats"
READER_PREFIX = "employee:"
"""Les lectures des employés partagent le registre des lectures des RH (US-116), sous « employee:<id> »."""


def reader_id(employee_id: str) -> str:
    return f"{READER_PREFIX}{employee_id}"


class EmployeeNotificationKind(StrEnum):
    OPENING = "OPENING"
    CERTIFICATE_VALIDATED = "CERTIFICATE_VALIDATED"
    CERTIFICATE_TO_CORRECT = "CERTIFICATE_TO_CORRECT"

    @property
    def label(self) -> str:
        return "Poste" if self is EmployeeNotificationKind.OPENING else "Certificat"


@dataclass(frozen=True)
class EmployeeNotification:
    key: str
    """Stable : « opening:<id> », « certificate:<id>:<statut> » (une nouvelle décision donne une nouvelle notification)."""
    kind: EmployeeNotificationKind
    title: str
    detail: str
    at: datetime
    link: str


def opening_notification(opening: JobOpening, unit_label: str) -> EmployeeNotification:
    published = max((change.at for change in opening.history if change.status is OpeningStatus.PUBLISHED), default=None)
    opened = datetime.combine(opening.opens_on, time(), tzinfo=UTC)
    return EmployeeNotification(
        key=f"opening:{opening.id}",
        kind=EmployeeNotificationKind.OPENING,
        title="Nouveau poste ouvert pour vous",
        detail=f"{opening.title} · {unit_label} · jusqu'au {opening.closes_on.strftime('%d/%m/%Y')}",
        at=max(published, opened) if published else opened,
        link=CAREER_LINK,
    )


def certificate_notification(certificate: Certificate) -> EmployeeNotification | None:
    """Une décision des RH ; rien tant que le certificat attend."""
    if certificate.decided_at is None:
        return None
    if certificate.status is CertificateStatus.VALIDATED:
        kind, title, detail = EmployeeNotificationKind.CERTIFICATE_VALIDATED, "Certificat validé", certificate.title
    elif certificate.status is CertificateStatus.TO_CORRECT:
        reason = certificate.rejection_reason
        kind, title = EmployeeNotificationKind.CERTIFICATE_TO_CORRECT, "Certificat à corriger"
        detail = f"{certificate.title} : {reason}" if reason else certificate.title
    else:
        return None
    return EmployeeNotification(
        f"certificate:{certificate.id}:{certificate.status.value}", kind, title, detail, certificate.decided_at,
        CERTIFICATES_LINK,
    )
