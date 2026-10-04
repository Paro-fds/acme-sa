from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from app.update.domain.editable_fields import editable_field
from app.update.domain.errors import ConfirmationRequired, UpdateAlreadySubmitted, UpdateNotStarted


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
    changes: dict[str, FieldChange] = field(default_factory=dict)

    @classmethod
    def start(cls, employee_id: str, accepted: bool, now: datetime) -> "EmployeeUpdate":
        return cls(employee_id, UpdateStatus.DRAFT, accepted, created_at=now, updated_at=now)

    @property
    def is_submitted(self) -> bool:
        return self.status == UpdateStatus.SUBMITTED

    def decide(self, accepted: bool, now: datetime) -> None:
        """Réponse Oui/Non (US-08). Un « Oui » répété conserve le brouillon existant."""
        self._ensure_open()
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
        """Soumission définitive (US-12, D-04)."""
        self._ensure_open()
        if not self.accepted:
            raise UpdateNotStarted()
        if not confirmed:
            raise ConfirmationRequired(field="confirmed")
        self.status = UpdateStatus.SUBMITTED
        self.submitted_at = now
        self.updated_at = now

    def _ensure_open(self) -> None:
        if self.is_submitted:
            raise UpdateAlreadySubmitted()


def admin_status(update: EmployeeUpdate | None) -> AdminStatus:
    return AdminStatus.UPDATED if update is not None and update.is_submitted else AdminStatus.NOT_UPDATED


def employee_state(update: EmployeeUpdate | None) -> EmployeeState:
    if update is None:
        return EmployeeState.NOT_DONE
    if update.is_submitted:
        return EmployeeState.DONE
    return EmployeeState.IN_PROGRESS if update.accepted else EmployeeState.NOT_DONE
