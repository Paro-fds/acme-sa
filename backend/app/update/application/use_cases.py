from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime

from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock
from app.update.application.values import reference_values
from app.update.domain.editable_fields import EDITABLE_FIELDS, Section
from app.update.domain.errors import NoReopenedUpdate, UpdateAlreadySubmitted, UpdateNotStarted, UpdateNotSubmitted
from app.update.domain.repository import UpdateRepository
from app.update.domain.update import EmployeeState, EmployeeUpdate, FieldChange, employee_state


@dataclass(frozen=True)
class ChangeView:
    field_name: str
    label: str
    section: Section
    old_value: str
    new_value: str
    changed_at: datetime


@dataclass(frozen=True)
class UpdateView:
    state: EmployeeState
    accepted: bool | None
    created_at: datetime | None
    updated_at: datetime | None
    submitted_at: datetime | None
    """Date du dernier envoi (US-24 : conservée pendant une nouvelle modification)."""
    reopened: bool
    """« Modifier à nouveau » en cours (US-24)."""
    changes: list[ChangeView]


@dataclass(frozen=True)
class FieldView:
    code: str
    label: str
    section: Section
    required: bool
    original_value: str
    value: str

    @property
    def modified(self) -> bool:
        return self.value != self.original_value


def change_views(changes: Mapping[str, FieldChange]) -> list[ChangeView]:
    """Changements dans l'ordre du registre des champs."""
    return [
        ChangeView(
            field_name=code,
            label=field.label,
            section=field.section,
            old_value=changes[code].old_value,
            new_value=changes[code].new_value,
            changed_at=changes[code].changed_at,
        )
        for code, field in EDITABLE_FIELDS.items()
        if code in changes
    ]


def update_view(update: EmployeeUpdate | None) -> UpdateView:
    return UpdateView(
        state=employee_state(update),
        accepted=update.accepted if update else None,
        created_at=update.created_at if update else None,
        updated_at=update.updated_at if update else None,
        submitted_at=update.submitted_at if update else None,
        reopened=update.is_reopened if update else False,
        changes=change_views(update.changes) if update else [],
    )


class GetMyUpdate:
    def __init__(self, updates: UpdateRepository) -> None:
        self._updates = updates

    def execute(self, employee_id: str) -> UpdateView:
        return update_view(self._updates.get_for_employee(employee_id))


class GetEditableFields:
    """Formulaire de l'étape 1 : valeur d'origine et valeur du brouillon pour chaque champ.

    Disponible seulement après un « Oui » (US-09 CA-09) et avant la soumission (US-12 CA-04).
    """

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository) -> None:
        self._employees = employees
        self._updates = updates

    def execute(self, employee_id: str) -> list[FieldView]:
        reference = reference_values(get_employee(self._employees, employee_id))
        update = self._updates.get_for_employee(employee_id)
        if update is None or not update.accepted:
            raise UpdateNotStarted()
        if update.is_submitted:
            raise UpdateAlreadySubmitted()
        changes = update.changes
        return [
            FieldView(
                code=code,
                label=field.label,
                section=field.section,
                required=field.required,
                original_value=reference[code],
                value=changes[code].new_value if code in changes else reference[code],
            )
            for code, field in EDITABLE_FIELDS.items()
        ]


class RecordDecision:
    """US-08 : réponse Oui/Non à la question « Souhaitez-vous mettre à jour votre dossier ? »."""

    def __init__(self, updates: UpdateRepository, clock: Clock) -> None:
        self._updates = updates
        self._clock = clock

    def execute(self, employee_id: str, accepted: bool) -> UpdateView:
        now = self._clock.now()
        update = self._updates.get_for_employee(employee_id)
        if update is None:
            update = EmployeeUpdate.start(employee_id, accepted, now)
        else:
            update.decide(accepted, now)
        self._updates.save(update)
        return update_view(update)


class SaveDraft:
    """US-09 / US-10 : enregistre les modifications dans le brouillon."""

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository, clock: Clock) -> None:
        self._employees = employees
        self._updates = updates
        self._clock = clock

    def execute(self, employee_id: str, values: Mapping[str, str]) -> UpdateView:
        employee = get_employee(self._employees, employee_id)
        update = self._updates.get_for_employee(employee_id)
        if update is None:
            raise UpdateNotStarted()
        update.record_changes(reference_values(employee), values, self._clock.now())
        self._updates.save(update)
        return update_view(update)


class SubmitUpdate:
    """US-12 : confirmation et soumission définitive."""

    def __init__(self, updates: UpdateRepository, clock: Clock) -> None:
        self._updates = updates
        self._clock = clock

    def execute(self, employee_id: str, confirmed: bool) -> UpdateView:
        update = self._updates.get_for_employee(employee_id)
        if update is None:
            raise UpdateNotStarted()
        update.submit(confirmed, self._clock.now())
        self._updates.save(update)
        return update_view(update)


class ReopenUpdate:
    """US-24 « Modifier à nouveau » : nouveau brouillon à partir des valeurs envoyées."""

    def __init__(self, updates: UpdateRepository, clock: Clock) -> None:
        self._updates = updates
        self._clock = clock

    def execute(self, employee_id: str) -> UpdateView:
        update = self._updates.get_for_employee(employee_id)
        if update is None:
            raise UpdateNotSubmitted()
        update.reopen(self._clock.now())
        self._updates.save(update)
        return update_view(update)


class DiscardUpdate:
    """US-24 « Annuler les modifications » : retour à la dernière version envoyée."""

    def __init__(self, updates: UpdateRepository, clock: Clock) -> None:
        self._updates = updates
        self._clock = clock

    def execute(self, employee_id: str) -> UpdateView:
        update = self._updates.get_for_employee(employee_id)
        if update is None or not update.is_reopened:
            raise NoReopenedUpdate()
        update.discard(self._clock.now())
        self._updates.save(update)
        return update_view(update)
