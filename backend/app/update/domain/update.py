from collections.abc import Mapping
from dataclasses import dataclass, field, replace
from datetime import datetime
from enum import StrEnum

from app.update.domain.editable_fields import editable_field
from app.update.domain.errors import (
    ConfirmationRequired,
    NoReopenedUpdate,
    UpdateAlreadySubmitted,
    UpdateNotStarted,
    UpdateNotSubmitted,
)


class UpdateStatus(StrEnum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"


class AdminStatus(StrEnum):
    """Côté administration, deux statuts seulement (Solution Design §6.1)."""

    UPDATED = "UPDATED"
    NOT_UPDATED = "NOT_UPDATED"


class EmployeeState(StrEnum):
    """Côté employé : le brouillon est visible pour pouvoir reprendre la démarche (US-06)."""

    NOT_DONE = "NOT_DONE"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


@dataclass
class FieldChange:
    field_name: str
    old_value: str
    new_value: str
    changed_at: datetime


@dataclass
class EmployeeUpdate:
    employee_id: str
    status: UpdateStatus
    accepted: bool
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None = None
    """Date du **dernier** envoi (conservée pendant une nouvelle modification, US-24)."""
    changes: dict[str, FieldChange] = field(default_factory=dict)
    """Changements en cours d'édition (brouillon), ou ceux de l'envoi quand le statut est SUBMITTED."""
    submitted_changes: dict[str, FieldChange] = field(default_factory=dict)
    """Copie du dernier envoi : ce que voient l'administration et l'identification (US-24)."""

    @classmethod
    def start(cls, employee_id: str, accepted: bool, now: datetime) -> "EmployeeUpdate":
        return cls(employee_id, UpdateStatus.DRAFT, accepted, created_at=now, updated_at=now)

    @property
    def is_submitted(self) -> bool:
        """Envoyée et pas rouverte : aucune écriture acceptée."""
        return self.status == UpdateStatus.SUBMITTED

    @property
    def has_submission(self) -> bool:
        """Au moins un envoi, même si une nouvelle modification est en cours (US-24)."""
        return self.submitted_at is not None

    @property
    def is_reopened(self) -> bool:
        """« Modifier à nouveau » : brouillon en cours après un envoi (US-24)."""
        return self.has_submission and not self.is_submitted

    def decide(self, accepted: bool, now: datetime) -> None:
        """Réponse Oui/Non (US-08). Un « Oui » répété conserve le brouillon existant."""
        self._ensure_open()
        if self.has_submission:
            raise UpdateAlreadySubmitted()
        self.accepted = accepted
        self.updated_at = now

    def record_changes(self, reference: Mapping[str, str], new_values: Mapping[str, str], now: datetime) -> None:
        """Enregistre les nouvelles valeurs (US-09/US-10).

        Tout ou rien : si une valeur est invalide, rien n'est enregistré.
        Un champ remis à sa valeur de référence n'est plus un changement.
        """
        self._ensure_open()
        if not self.accepted:
            raise UpdateNotStarted()

        cleaned = {code: editable_field(code).clean(raw) for code, raw in new_values.items()}
        for code, value in cleaned.items():
            old_value = (reference.get(code) or "").strip()
            if value == old_value:
                self.changes.pop(code, None)
                continue
            existing = self.changes.get(code)
            if existing is None or existing.new_value != value:
                self.changes[code] = FieldChange(code, old_value, value, changed_at=now)
        self.updated_at = now

    def submit(self, confirmed: bool, now: datetime) -> None:
        """Envoi (US-12) ; il remplace l'envoi précédent (US-24)."""
        self._ensure_open()
        if not self.accepted:
            raise UpdateNotStarted()
        if not confirmed:
            raise ConfirmationRequired(field="confirmed")
        self.status = UpdateStatus.SUBMITTED
        self.submitted_at = now
        self.submitted_changes = _copy(self.changes)
        self.updated_at = now

    def reopen(self, now: datetime) -> None:
        """US-24 « Modifier à nouveau » : brouillon repris des valeurs envoyées, copie conservée."""
        if not self.is_submitted:
            raise UpdateNotSubmitted()
        self.status = UpdateStatus.DRAFT
        self.accepted = True
        self.changes = _copy(self.submitted_changes)
        self.updated_at = now

    def discard(self, now: datetime) -> None:
        """US-24 « Annuler les modifications » : retour à la dernière version envoyée."""
        if not self.is_reopened:
            raise NoReopenedUpdate()
        self.status = UpdateStatus.SUBMITTED
        self.changes = _copy(self.submitted_changes)
        self.updated_at = now

    def _ensure_open(self) -> None:
        if self.is_submitted:
            raise UpdateAlreadySubmitted()


def _copy(changes: Mapping[str, FieldChange]) -> dict[str, FieldChange]:
    return {code: replace(change) for code, change in changes.items()}


def admin_status(update: EmployeeUpdate | None) -> AdminStatus:
    """`UPDATED` dès le premier envoi, y compris pendant une nouvelle modification (US-24)."""
    return AdminStatus.UPDATED if update is not None and update.has_submission else AdminStatus.NOT_UPDATED


def employee_state(update: EmployeeUpdate | None) -> EmployeeState:
    if update is None:
        return EmployeeState.NOT_DONE
    if update.is_submitted:
        return EmployeeState.DONE
    return EmployeeState.IN_PROGRESS if update.accepted else EmployeeState.NOT_DONE
