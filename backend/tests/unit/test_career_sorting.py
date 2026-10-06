"""US-25 — Tri des éléments du parcours (T-25.1, Solution Design V2 §3.2)."""

from datetime import timedelta

from app.career.domain.career_entry import sort_entries
from app.career.domain.entry_kinds import EntryKind, SkillLevel
from app.career.domain.months import Month
from tests.career import CREATED_AT, make_entry

EMPLOYEE = "1001"


def _titles(entries):
    return [entry.title for entry in entries]


def test_ca02_current_experience_first_then_most_recent_end():
    old = make_entry(EMPLOYEE, EntryKind.EXPERIENCE, title="Caissier", start_month=Month(2016, 1), end_month=Month(2019, 12))
    current = make_entry(EMPLOYEE, EntryKind.EXPERIENCE, title="Agent de crédit", start_month=Month(2020, 1), end_month=None)
    middle = make_entry(EMPLOYEE, EntryKind.EXPERIENCE, title="Guichetier", start_month=Month(2012, 5), end_month=Month(2015, 12))

    assert _titles(sort_entries(EntryKind.EXPERIENCE, [old, middle, current])) == ["Agent de crédit", "Caissier", "Guichetier"]


def test_ongoing_trainings_are_sorted_by_most_recent_start():
    a = make_entry(EMPLOYEE, EntryKind.TRAINING, title="A", start_month=Month(2024, 1), end_month=None)
    b = make_entry(EMPLOYEE, EntryKind.TRAINING, title="B", start_month=Month(2025, 9), end_month=None)
    done = make_entry(EMPLOYEE, EntryKind.TRAINING, title="Terminée", start_month=Month(2026, 1), end_month=Month(2026, 2))

    assert _titles(sort_entries(EntryKind.TRAINING, [a, done, b])) == ["B", "A", "Terminée"]


def test_same_end_then_most_recent_start_then_most_recent_creation():
    first = make_entry(EMPLOYEE, EntryKind.TRAINING, title="Créée en premier", start_month=Month(2025, 1), end_month=Month(2025, 6))
    later = make_entry(
        EMPLOYEE, EntryKind.TRAINING, title="Créée ensuite", start_month=Month(2025, 1), end_month=Month(2025, 6),
        created_at=CREATED_AT + timedelta(minutes=5),
    )
    longer = make_entry(EMPLOYEE, EntryKind.TRAINING, title="Commencée avant", start_month=Month(2024, 9), end_month=Month(2025, 6))

    assert _titles(sort_entries(EntryKind.TRAINING, [longer, first, later])) == [
        "Créée ensuite", "Créée en premier", "Commencée avant",
    ]


def test_ca02_qualifications_by_most_recent_obtention():
    old = make_entry(EMPLOYEE, EntryKind.QUALIFICATION, title="Baccalauréat", start_month=Month(2015, 7))
    recent = make_entry(EMPLOYEE, EntryKind.QUALIFICATION, title="Licence", start_month=Month(2021, 6))
    # Une date d'expiration ne change pas l'ordre : seule l'obtention compte.
    certification = make_entry(
        EMPLOYEE, EntryKind.QUALIFICATION, title="Certification", start_month=Month(2018, 3), end_month=Month(2030, 3),
    )

    assert _titles(sort_entries(EntryKind.QUALIFICATION, [old, certification, recent])) == [
        "Licence", "Certification", "Baccalauréat",
    ]


def test_skills_by_level_then_alphabetically_ignoring_case_and_accents():
    skills = [
        make_entry(EMPLOYEE, EntryKind.SKILL, title="Excel", skill_level=SkillLevel.GOOD),
        make_entry(EMPLOYEE, EntryKind.SKILL, title="Anglais", skill_level=SkillLevel.BASIC),
        make_entry(EMPLOYEE, EntryKind.SKILL, title="Analyse de crédit", skill_level=SkillLevel.EXPERT),
        make_entry(EMPLOYEE, EntryKind.SKILL, title="Comptabilité", skill_level=SkillLevel.GOOD),
        make_entry(EMPLOYEE, EntryKind.SKILL, title="écoute client", skill_level=SkillLevel.GOOD),
    ]

    assert _titles(sort_entries(EntryKind.SKILL, skills)) == [
        "Analyse de crédit", "Comptabilité", "écoute client", "Excel", "Anglais",
    ]
