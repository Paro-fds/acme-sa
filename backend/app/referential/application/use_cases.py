"""US-501 : import du référentiel (lot 1 : fichier Excel importé par un Administrateur, D-27) et consultation."""

from dataclasses import dataclass, field
from datetime import date

from app.referential.domain.errors import ReferentialRejected
from app.referential.domain.ports import ReferentialFileReader, ReferentialRepository
from app.referential.domain.units import (
    Attachment,
    Mapping,
    Unit,
    UnitType,
    check,
    normalize,
    unit_type_from_label,
)
from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.clock import Clock


@dataclass(frozen=True)
class ImportSummary:
    counts: dict[str, int]
    """Unités par type (« Agence » : 35…)."""
    added: int
    renamed: list[str] = field(default_factory=list)
    """« PV : Pétion-Ville → Agence de Pétion-Ville »."""
    moved: list[str] = field(default_factory=list)
    """« AQ : Grand Sud 1 → Grand Sud 2 (depuis le 01/11/2026) »."""
    mappings: int = 0
    unmapped: int = 0
    """Valeurs de l'export encore « À rattacher »."""


class ImportReferential:
    """CA-01 → CA-03.

    Le fichier décrit le référentiel complet. Un fichier incohérent est refusé en entier. Une unité absente
    du fichier n'est jamais supprimée : son code reste valable pour l'historique (RG-70).
    """

    def __init__(self, reader: ReferentialFileReader, repository: ReferentialRepository, clock: Clock) -> None:
        self._reader = reader
        self._repository = repository
        self._clock = clock

    def execute(self, content: bytes, file_name: str, admin_username: str) -> ImportSummary:
        file = self._reader.read(content)
        problems = check(file)
        if problems:
            raise ReferentialRejected(problems)

        now = self._clock.now()
        today = now.date()
        existing = self._repository.units()
        current = self._repository.current_attachments()
        units: list[Unit] = []
        closed: list[Attachment] = []
        opened: list[Attachment] = []
        renamed: list[str] = []
        moved: list[str] = []
        added = 0
        labels = {row.code: row.label.strip() for row in file.units}

        for row in file.units:
            unit_type = unit_type_from_label(row.type_label)
            unit = existing.get(row.code)
            if unit is None:
                unit = Unit(row.code, row.label.strip(), unit_type, start=today)
                added += 1
            else:
                old_label = unit.label
                if unit.rename(row.label.strip()):
                    renamed.append(f"{row.code} : {old_label} → {unit.label}")
                unit.type = unit_type
            for former in row.former_labels:
                if former and former != unit.label and former not in unit.former_labels:
                    unit.former_labels.append(former)
            units.append(unit)

            attachment = current.get(row.code)
            if not row.parent_code:
                continue
            since = row.parent_since or today
            if attachment is None:
                opened.append(Attachment(row.code, row.parent_code, since))
            elif attachment.parent_code != row.parent_code:
                # CA-03 : une seule région à la fois ; l'ancienne se termine quand la nouvelle commence.
                closed.append(Attachment(attachment.unit_code, attachment.parent_code, attachment.start, since))
                opened.append(Attachment(row.code, row.parent_code, since))
                previous = existing[attachment.parent_code].label if attachment.parent_code in existing else attachment.parent_code
                moved.append(f"{row.code} : {previous} → {labels[row.parent_code]} (depuis le {since:%d/%m/%Y})")

        mappings = [Mapping(row.column, row.value.strip(), row.unit_code or None) for row in file.mappings]
        self._repository.save_import(units, closed, opened, mappings, source=f"{file_name} ({admin_username})", imported_at=now)

        counts = {unit_type.label: 0 for unit_type in UnitType}
        for unit in units:
            counts[unit.type.label] += 1
        return ImportSummary(
            counts={label: count for label, count in counts.items() if count},
            added=added,
            renamed=renamed,
            moved=moved,
            mappings=len(mappings),
            unmapped=sum(1 for mapping in mappings if mapping.unit_code is None),
        )


@dataclass(frozen=True)
class UnitView:
    code: str
    label: str
    type: UnitType
    parent_code: str | None
    parent_label: str | None
    since: date | None
    former_labels: list[str]
    history: list[Attachment]


class GetReferential:
    """Le référentiel tel qu'il est enregistré : chaque unité avec son rattachement en cours et son historique."""

    def __init__(self, repository: ReferentialRepository) -> None:
        self._repository = repository

    def execute(self) -> tuple[list[UnitView], list[Mapping]]:
        units = self._repository.units()
        current = self._repository.current_attachments()
        views = []
        order = list(UnitType)
        for unit in sorted(units.values(), key=lambda u: (order.index(u.type), u.label.casefold())):
            attachment = current.get(unit.code)
            parent = units.get(attachment.parent_code) if attachment else None
            views.append(
                UnitView(
                    code=unit.code,
                    label=unit.label,
                    type=unit.type,
                    parent_code=attachment.parent_code if attachment else None,
                    parent_label=parent.label if parent else None,
                    since=attachment.start if attachment else None,
                    former_labels=list(unit.former_labels),
                    history=self._repository.attachments_of(unit.code),
                )
            )
        return views, self._repository.mappings()


@dataclass(frozen=True)
class Affectation:
    """Libellés officiels de l'affectation d'un employé ; None = « Unité à confirmer » (RG-17)."""

    agency: str | None
    region: str | None
    direction: str | None


class ResolveAffectation:
    """US-201 CA-01, CA-03 : valeurs de l'export → agence, région en cours, direction (celle d'un service s'il le faut)."""

    def __init__(self, repository: ReferentialRepository) -> None:
        self._repository = repository

    def execute(self, agency_value: str, department_value: str) -> Affectation:
        mappings = {(m.column, normalize(m.value)): m.unit_code for m in self._repository.mappings()}
        units = self._repository.units()
        current = self._repository.current_attachments()

        def unit_for(column: str, value: str) -> Unit | None:
            code = mappings.get((column, normalize(value))) if value and value.strip() else None
            return units.get(code) if code else None

        def parent_of(unit: Unit | None) -> Unit | None:
            attachment = current.get(unit.code) if unit else None
            return units.get(attachment.parent_code) if attachment else None

        agency = unit_for("agency_code", agency_value)
        region = parent_of(agency) if agency and agency.type is UnitType.AGENCY else None
        direction = unit_for("department", department_value)
        if direction is not None and direction.type is UnitType.SERVICE:
            direction = parent_of(direction)
        return Affectation(
            agency=agency.label if agency else None,
            region=region.label if region else None,
            direction=direction.label if direction and direction.type is UnitType.DIRECTION else None,
        )


@dataclass(frozen=True)
class ToAttach:
    """US-502 CA-01 : une valeur de l'export sans unité officielle, et le nombre d'employés actifs concernés."""

    column: str
    value: str
    employees: int


class ListToAttach:
    """US-502 : la liste « À rattacher » — aucune valeur de l'export n'est ignorée (RG-17). Une valeur sort de la
    liste dès qu'un import du référentiel la relie à une unité (CA-03)."""

    def __init__(self, repository: ReferentialRepository, employees: EmployeeRepository) -> None:
        self._repository = repository
        self._employees = employees

    def execute(self) -> list[ToAttach]:
        attached = {(m.column, normalize(m.value)) for m in self._repository.mappings() if m.unit_code}
        counts: dict[tuple[str, str], int] = {}
        shown: dict[tuple[str, str], str] = {}
        for employee in self._employees.list_all():
            for column, value in (("agency_code", employee.agency_code), ("department", employee.department)):
                if not (value and value.strip()):
                    continue
                key = (column, normalize(value))
                if key in attached:
                    continue
                counts[key] = counts.get(key, 0) + 1
                shown.setdefault(key, value.strip())
        return sorted(
            (ToAttach(column, shown[(column, norm)], n) for (column, norm), n in counts.items()),
            key=lambda item: (-item.employees, item.column, item.value.casefold()),
        )
