from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from app.career.domain.entry_kinds import EntryKind, QualificationType, SkillLevel
from app.career.domain.months import Month
from app.shared.domain.text import normalize


@dataclass(frozen=True)
class Proof:
    """Justificatif d'un élément (AD-V2-04) : rangé avec l'élément, pas dans « Mes documents » (D-09)."""

    original_name: str
    stored_name: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


@dataclass(frozen=True)
class CareerEntry:
    """Élément du parcours (diplôme, formation, expérience ou compétence).

    Les colonnes utilisées par chaque rubrique sont déclarées dans `entry_kinds.ENTRY_KINDS` ;
    les autres restent vides.
    """

    id: str
    employee_id: str
    kind: EntryKind
    created_at: datetime
    updated_at: datetime
    qualification_type: QualificationType | None = None
    title: str = ""
    organization: str | None = None
    location: str | None = None
    start_month: Month | None = None
    end_month: Month | None = None
    duration_hours: int | None = None
    description: str | None = None
    skill_level: SkillLevel | None = None
    proof: Proof | None = None


@dataclass(frozen=True)
class CareerProfile:
    """Suivi du parcours d'un employé (AD-V2-08) : nombre d'éléments et date de dernière modification."""

    employee_id: str
    entry_count: int
    last_changed_at: datetime

    @property
    def is_enriched(self) -> bool:
        """RM-V2-07 : au moins un élément."""
        return self.entry_count > 0


_NO_MONTH = Month(0, 0)


def _dated_key(entry: CareerEntry) -> tuple:
    """Formations, expériences : en cours d'abord, puis fin, début et création les plus récents."""
    ongoing = entry.end_month is None
    return (ongoing, entry.end_month or _NO_MONTH, entry.start_month or _NO_MONTH, entry.created_at)


def _qualification_key(entry: CareerEntry) -> tuple:
    return (entry.start_month or _NO_MONTH, entry.created_at)


def sort_entries(kind: EntryKind, entries: Iterable[CareerEntry]) -> list[CareerEntry]:
    """Ordre d'affichage d'une rubrique, du plus récent au plus ancien (Solution Design V2 §3.2)."""
    if kind is EntryKind.SKILL:
        return sorted(entries, key=lambda entry: (-(entry.skill_level.rank if entry.skill_level else -1), normalize(entry.title)))
    key = _qualification_key if kind is EntryKind.QUALIFICATION else _dated_key
    return sorted(entries, key=key, reverse=True)
