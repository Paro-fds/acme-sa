"""US-802 : un poste ouvert (EF-803, EF-804).

- La fiche : intitulé et code, unité, grade visé, mission, critères, dates d'ouverture et limite (CA-01).
- Les critères sont structurés pour que l'éligibilité (US-801, EF-805) puisse les calculer ; aucun n'est obligatoire.
- Statuts Brouillon → Publié → Clôturé → Pourvu, chacun daté et signé ; un critère modifié après publication est
  tracé (CA-02). Un poste clôturé ou pourvu ne se modifie plus.
"""

import re
from dataclasses import dataclass, field, replace
from datetime import date, datetime
from enum import StrEnum

from app.certificate.domain.certificate import DOMAIN_LABELS
from app.job.domain.errors import InvalidOpeningField, OpeningLocked, OpeningTransitionRefused
from app.shared.domain.levels import LEVELS_BY_CODE

_CODE = re.compile(r"^[A-Z0-9][A-Z0-9_-]{1,19}$")
_NUMBER = re.compile(r"^\d{1,2}$")
TITLE_MAX = 120
MISSION_MAX = 2000
YEARS_MAX = 50


class OpeningStatus(StrEnum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"
    FILLED = "FILLED"

    @property
    def label(self) -> str:
        return _STATUS_LABELS[self]


_STATUS_LABELS = {
    OpeningStatus.DRAFT: "Brouillon",
    OpeningStatus.PUBLISHED: "Publié",
    OpeningStatus.CLOSED: "Clôturé",
    OpeningStatus.FILLED: "Pourvu",
}


@dataclass(frozen=True)
class Actor:
    """Compte RH qui agit : son nom est gardé avec chaque étape."""

    id: str
    name: str


def _years(value: int) -> str:
    return f"{value} an{'s' if value > 1 else ''} au moins"


@dataclass(frozen=True)
class Criteria:
    """EF-805 : niveau minimum, domaine, ancienneté dans l'institution, ancienneté dans le poste, grade, unité."""

    min_level: str | None = None
    domain: str | None = None
    min_years_in_institution: int | None = None
    min_years_in_position: int | None = None
    min_grade: str | None = None
    unit_code: str | None = None

    def describe(self, unit_labels: dict[str, str]) -> list[str]:
        """Les critères en phrases, pour la fiche et pour la trace des modifications."""
        lines = []
        if self.min_level:
            lines.append(f"Niveau d'études minimum : {LEVELS_BY_CODE[self.min_level].label}")
        if self.domain:
            lines.append(f"Domaine : {DOMAIN_LABELS[self.domain]}")
        if self.min_years_in_institution is not None:
            lines.append(f"Ancienneté dans l'institution : {_years(self.min_years_in_institution)}")
        if self.min_years_in_position is not None:
            lines.append(f"Ancienneté dans le poste : {_years(self.min_years_in_position)}")
        if self.min_grade:
            lines.append(f"Grade minimum : {self.min_grade}")
        if self.unit_code:
            lines.append(f"Unité : {unit_labels.get(self.unit_code, self.unit_code)}")
        return lines


@dataclass(frozen=True)
class OpeningFields:
    code: str
    title: str
    unit_code: str
    target_grade: str
    mission: str
    opens_on: date | None
    closes_on: date | None
    criteria: Criteria = Criteria()


def _required(value: str | None, field_name: str, message: str) -> str:
    text = (value or "").strip()
    if not text:
        raise InvalidOpeningField(message, field=field_name)
    return text


def _check_years(value: int | None, field_name: str) -> None:
    if value is not None and not 0 <= value <= YEARS_MAX:
        raise InvalidOpeningField(f"Indiquez un nombre d'années entre 0 et {YEARS_MAX}.", field=field_name)


def _check_criteria(criteria: Criteria, units: dict[str, str]) -> Criteria:
    level = LEVELS_BY_CODE.get(criteria.min_level) if criteria.min_level else None
    if criteria.min_level and (level is None or not level.on_scale):
        raise InvalidOpeningField("Choisissez un niveau d'études de la liste.", field="min_level")
    if criteria.domain and criteria.domain not in DOMAIN_LABELS:
        raise InvalidOpeningField("Choisissez un domaine de la liste.", field="domain")
    _check_years(criteria.min_years_in_institution, "min_years_in_institution")
    _check_years(criteria.min_years_in_position, "min_years_in_position")
    min_grade = (criteria.min_grade or "").strip() or None
    if min_grade and not _NUMBER.match(min_grade):
        raise InvalidOpeningField("Le grade est un nombre, par exemple 8.", field="min_grade")
    unit_code = criteria.unit_code or None
    if unit_code and unit_code not in units:
        raise InvalidOpeningField("Choisissez une unité du référentiel.", field="criteria_unit_code")
    return replace(criteria, min_grade=min_grade, unit_code=unit_code, domain=criteria.domain or None,
                   min_level=criteria.min_level or None)


def validate_fields(fields: OpeningFields, units: dict[str, str]) -> OpeningFields:
    """CA-01 : contrôle la fiche et renvoie les valeurs nettoyées ; `units` = code → libellé du référentiel."""
    code = _required(fields.code, "code", "Indiquez le code du poste.").upper()
    if not _CODE.match(code):
        raise InvalidOpeningField(
            "Code : lettres sans accents, chiffres et tirets, sans espace (20 caractères au plus).", field="code"
        )
    title = _required(fields.title, "title", "Indiquez l'intitulé du poste.")
    if len(title) > TITLE_MAX:
        raise InvalidOpeningField(f"L'intitulé tient en {TITLE_MAX} caractères au plus.", field="title")
    unit_code = _required(fields.unit_code, "unit_code", "Choisissez l'unité du poste.")
    if unit_code not in units:
        raise InvalidOpeningField("Choisissez une unité du référentiel.", field="unit_code")
    target_grade = _required(fields.target_grade, "target_grade", "Indiquez le grade visé.")
    if not _NUMBER.match(target_grade):
        raise InvalidOpeningField("Le grade est un nombre, par exemple 10.", field="target_grade")
    mission = _required(fields.mission, "mission", "Décrivez la mission du poste.")
    if len(mission) > MISSION_MAX:
        raise InvalidOpeningField(f"La mission tient en {MISSION_MAX} caractères au plus.", field="mission")
    if fields.opens_on is None:
        raise InvalidOpeningField("Indiquez la date d'ouverture.", field="opens_on")
    if fields.closes_on is None:
        raise InvalidOpeningField("Indiquez la date limite.", field="closes_on")
    if fields.closes_on < fields.opens_on:
        raise InvalidOpeningField("La date limite vient après la date d'ouverture.", field="closes_on")
    return OpeningFields(
        code=code,
        title=title,
        unit_code=unit_code,
        target_grade=target_grade,
        mission=mission,
        opens_on=fields.opens_on,
        closes_on=fields.closes_on,
        criteria=_check_criteria(fields.criteria, units),
    )


@dataclass(frozen=True)
class StatusChange:
    status: OpeningStatus
    at: datetime
    actor: Actor


@dataclass(frozen=True)
class CriteriaChange:
    """CA-02 : critères avant et après une modification faite après publication."""

    at: datetime
    actor: Actor
    before: tuple[str, ...]
    after: tuple[str, ...]


@dataclass
class JobOpening:
    id: int | None
    code: str
    title: str
    unit_code: str
    target_grade: str
    mission: str
    opens_on: date
    closes_on: date
    criteria: Criteria
    status: OpeningStatus
    history: list[StatusChange] = field(default_factory=list)
    criteria_changes: list[CriteriaChange] = field(default_factory=list)

    @classmethod
    def create(cls, fields: OpeningFields, actor: Actor, at: datetime) -> "JobOpening":
        """Un poste saisi est un brouillon, en attente de la validation d'un Administrateur."""
        opening = cls(None, "", "", "", "", "", fields.opens_on, fields.closes_on, fields.criteria, OpeningStatus.DRAFT)
        opening._apply(fields)
        opening.history.append(StatusChange(OpeningStatus.DRAFT, at, actor))
        return opening

    @property
    def fields(self) -> OpeningFields:
        return OpeningFields(
            self.code, self.title, self.unit_code, self.target_grade, self.mission, self.opens_on, self.closes_on,
            self.criteria,
        )

    def update(self, fields: OpeningFields, actor: Actor, at: datetime, unit_labels: dict[str, str] | None = None) -> None:
        if self.status in (OpeningStatus.CLOSED, OpeningStatus.FILLED):
            raise OpeningLocked()
        if self.status is OpeningStatus.PUBLISHED and fields.criteria != self.criteria:
            labels = unit_labels or {}
            self.criteria_changes.append(
                CriteriaChange(at, actor, tuple(self.criteria.describe(labels)), tuple(fields.criteria.describe(labels)))
            )
        self._apply(fields)

    def publish(self, actor: Actor, at: datetime) -> None:
        self._move({OpeningStatus.DRAFT}, OpeningStatus.PUBLISHED, actor, at, "Seul un brouillon peut être publié.")

    def close(self, actor: Actor, at: datetime) -> None:
        self._move({OpeningStatus.PUBLISHED}, OpeningStatus.CLOSED, actor, at, "Seul un poste publié peut être clôturé.")

    def fill(self, actor: Actor, at: datetime) -> None:
        self._move(
            {OpeningStatus.PUBLISHED, OpeningStatus.CLOSED}, OpeningStatus.FILLED, actor, at,
            "Seul un poste publié ou clôturé peut être pourvu.",
        )

    def _move(self, allowed: set[OpeningStatus], target: OpeningStatus, actor: Actor, at: datetime, message: str) -> None:
        if self.status not in allowed:
            raise OpeningTransitionRefused(message)
        self.status = target
        self.history.append(StatusChange(target, at, actor))

    def _apply(self, fields: OpeningFields) -> None:
        self.code = fields.code
        self.title = fields.title
        self.unit_code = fields.unit_code
        self.target_grade = fields.target_grade
        self.mission = fields.mission
        self.opens_on = fields.opens_on
        self.closes_on = fields.closes_on
        self.criteria = fields.criteria
