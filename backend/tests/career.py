"""Aides pour les tests du parcours professionnel (V2, docs/v2/epics/README.md)."""

from dataclasses import replace
from datetime import UTC, datetime

from app.career.domain.career_entry import CareerEntry
from app.career.domain.entry_kinds import EntryKind, QualificationType, SkillLevel
from app.career.domain.months import Month

CREATED_AT = datetime(2026, 10, 15, 9, 0, tzinfo=UTC)

_DEFAULTS: dict[EntryKind, dict] = {
    EntryKind.QUALIFICATION: {
        "qualification_type": QualificationType.DIPLOME,
        "title": "Licence en sciences comptables",
        "organization": "Université d'État d'Haïti",
        "start_month": Month(2021, 6),
    },
    EntryKind.TRAINING: {
        "title": "Crédit aux PME",
        "organization": "ACME SA (interne)",
        "start_month": Month(2025, 3),
        "end_month": Month(2025, 4),
        "duration_hours": 24,
    },
    EntryKind.EXPERIENCE: {
        "title": "Caissier",
        "organization": "Banque XYZ",
        "location": "Cap-Haïtien",
        "start_month": Month(2016, 1),
        "end_month": Month(2019, 12),
        "description": "Accueil, opérations de caisse",
    },
    EntryKind.SKILL: {
        "title": "Analyse de crédit",
        "skill_level": SkillLevel.EXPERT,
    },
}

_counter = 0


def make_entry(employee_id: str, kind: EntryKind, **fields) -> CareerEntry:
    """Élément du parcours avec des valeurs par défaut réalistes pour sa rubrique."""
    global _counter
    _counter += 1
    entry = CareerEntry(
        id=f"entry-{_counter:04d}",
        employee_id=employee_id,
        kind=kind,
        created_at=CREATED_AT,
        updated_at=CREATED_AT,
    )
    return replace(entry, **{**_DEFAULTS[kind], **fields})
