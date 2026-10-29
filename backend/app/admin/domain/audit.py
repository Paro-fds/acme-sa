"""US-604 & US-602 CA-04 : journal d'audit des actions RH (traçabilité, consultation de dossier, intégrité)."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Protocol


class AuditAction(StrEnum):
    DOSSIER_VIEW = "DOSSIER_VIEW"
    DOCUMENT_VIEW = "DOCUMENT_VIEW"
    VALIDATION = "VALIDATION"
    REJECTION = "REJECTION"
    REASSIGNMENT = "REASSIGNMENT"
    EXPORT = "EXPORT"
    REFERENTIAL_CHANGE = "REFERENTIAL_CHANGE"
    ACCOUNT_MANAGEMENT = "ACCOUNT_MANAGEMENT"
    RESET_ACCESS = "RESET_ACCESS"
    JOB_OPENING = "JOB_OPENING"
    JOB_APPLICATION = "JOB_APPLICATION"


AUDIT_ACTION_LABELS = {
    AuditAction.DOSSIER_VIEW: "Consultation d'un dossier",
    AuditAction.DOCUMENT_VIEW: "Consultation d'un document",
    AuditAction.VALIDATION: "Validation",
    AuditAction.REJECTION: "Rejet",
    AuditAction.REASSIGNMENT: "Réaffectation",
    AuditAction.EXPORT: "Export",
    AuditAction.REFERENTIAL_CHANGE: "Modification du référentiel",
    AuditAction.ACCOUNT_MANAGEMENT: "Gestion des comptes",
    AuditAction.RESET_ACCESS: "Réinitialisation d'accès",
    AuditAction.JOB_OPENING: "Postes ouverts",
    AuditAction.JOB_APPLICATION: "Candidatures",
}


@dataclass(frozen=True)
class AuditEntry:
    id: int | None
    at: datetime
    actor_id: str
    actor_name: str | None
    action: str
    target_id: str
    target_name: str | None
    details: str | None


class AuditRepository(Protocol):
    def add(self, entry: AuditEntry) -> None:
        """Enregistre une action au journal d'audit."""
        ...

    def list_all(
        self,
        actor: str | None = None,
        target_id: str | None = None,
        action: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> list[AuditEntry]:
        """Consulte les entrées, du plus récent au plus ancien."""
        ...
