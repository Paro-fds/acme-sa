"""Registre des rubriques du parcours professionnel (Solution Design V2 §3, AD-V2-03).

Une seule table pour les quatre rubriques : chaque rubrique déclare ici les colonnes qu'elle utilise,
leurs libellés et leurs règles. Le formulaire du frontend est généré à partir de ce registre
(`GET /api/me/career/fields`) ; ajouter un champ ou une rubrique se fait ici.
"""

from dataclasses import dataclass
from enum import StrEnum


class EntryKind(StrEnum):
    QUALIFICATION = "QUALIFICATION"
    TRAINING = "TRAINING"
    EXPERIENCE = "EXPERIENCE"
    SKILL = "SKILL"


class QualificationType(StrEnum):
    DIPLOME = "DIPLOME"
    CERTIFICATION = "CERTIFICATION"

    @property
    def label(self) -> str:
        return _QUALIFICATION_LABELS[self]


class SkillLevel(StrEnum):
    BASIC = "BASIC"
    GOOD = "GOOD"
    EXPERT = "EXPERT"

    @property
    def label(self) -> str:
        return _SKILL_LABELS[self]

    @property
    def rank(self) -> int:
        """Rang du niveau : Notions (0) < Bon niveau (1) < Expert (2)."""
        return list(SkillLevel).index(self)


_QUALIFICATION_LABELS = {QualificationType.DIPLOME: "Diplôme", QualificationType.CERTIFICATION: "Certification"}
_SKILL_LABELS = {SkillLevel.BASIC: "Notions", SkillLevel.GOOD: "Bon niveau", SkillLevel.EXPERT: "Expert"}


class FieldType(StrEnum):
    TEXT = "TEXT"
    LONG_TEXT = "LONG_TEXT"
    CHOICE = "CHOICE"
    MONTH = "MONTH"
    INTEGER = "INTEGER"


@dataclass(frozen=True)
class FieldSpec:
    code: str
    """Nom de la colonne de `career_entry` (et de l'attribut de CareerEntry)."""
    label: str
    type: FieldType
    required: bool = False
    min_length: int | None = None
    max_length: int | None = None
    minimum: int | None = None
    maximum: int | None = None
    choices: tuple[tuple[str, str], ...] = ()
    only_when: tuple[str, str] | None = None
    """Champ proposé seulement si un autre champ a cette valeur (ex. expiration d'une certification)."""
    open_label: str | None = None
    """Date de fin facultative : libellé de la case qui la laisse vide (« Formation en cours »)."""


@dataclass(frozen=True)
class KindSpec:
    kind: EntryKind
    label: str
    fields: tuple[FieldSpec, ...]
    allows_proof: bool


def _text(code: str, label: str, *, required: bool = False, min_length: int | None = None, max_length: int) -> FieldSpec:
    return FieldSpec(code, label, FieldType.TEXT, required, min_length, max_length)


def _month(code: str, label: str, *, required: bool = False, **options) -> FieldSpec:
    return FieldSpec(code, label, FieldType.MONTH, required, **options)


ENTRY_KINDS: dict[EntryKind, KindSpec] = {
    spec.kind: spec
    for spec in (
        KindSpec(
            EntryKind.QUALIFICATION,
            "Diplômes et certifications",
            (
                FieldSpec(
                    "qualification_type", "Type", FieldType.CHOICE, True,
                    choices=tuple((value, value.label) for value in QualificationType),
                ),
                _text("title", "Intitulé", required=True, min_length=2, max_length=150),
                _text("organization", "Établissement ou organisme", required=True, min_length=2, max_length=150),
                _month("start_month", "Date d'obtention", required=True),
                _month("end_month", "Date d'expiration", only_when=("qualification_type", QualificationType.CERTIFICATION)),
            ),
            allows_proof=True,
        ),
        KindSpec(
            EntryKind.TRAINING,
            "Formations suivies",
            (
                _text("title", "Intitulé", required=True, min_length=2, max_length=150),
                _text("organization", "Organisme", required=True, min_length=2, max_length=150),
                _month("start_month", "Début", required=True),
                _month("end_month", "Fin", open_label="Formation en cours"),
                FieldSpec("duration_hours", "Durée (heures)", FieldType.INTEGER, minimum=1, maximum=2000),
            ),
            allows_proof=True,
        ),
        KindSpec(
            EntryKind.EXPERIENCE,
            "Expériences professionnelles",
            (
                _text("title", "Poste", required=True, min_length=2, max_length=150),
                _text("organization", "Employeur", required=True, min_length=2, max_length=150),
                _text("location", "Lieu", max_length=100),
                _month("start_month", "Début", required=True),
                _month("end_month", "Fin", open_label="Poste actuel"),
                FieldSpec("description", "Description", FieldType.LONG_TEXT, max_length=500),
            ),
            allows_proof=True,
        ),
        KindSpec(
            EntryKind.SKILL,
            "Compétences",
            (
                _text("title", "Compétence", required=True, min_length=2, max_length=60),
                FieldSpec(
                    "skill_level", "Niveau", FieldType.CHOICE, True,
                    choices=tuple((value, value.label) for value in SkillLevel),
                ),
            ),
            allows_proof=False,
        ),
    )
}
