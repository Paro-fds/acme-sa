"""US-25 — Registre des rubriques du parcours (T-25.2, Solution Design V2 §3)."""

from dataclasses import fields

import pytest

from app.career.domain.career_entry import CareerEntry
from app.career.domain.entry_kinds import ENTRY_KINDS, EntryKind, FieldType, QualificationType, SkillLevel


def _codes(kind: EntryKind) -> list[str]:
    return [field.code for field in ENTRY_KINDS[kind].fields]


def _required(kind: EntryKind) -> list[str]:
    return [field.code for field in ENTRY_KINDS[kind].fields if field.required]


def test_ca07_four_kinds_in_display_order_with_labels():
    assert [(kind, spec.label) for kind, spec in ENTRY_KINDS.items()] == [
        (EntryKind.QUALIFICATION, "Diplômes et certifications"),
        (EntryKind.TRAINING, "Formations suivies"),
        (EntryKind.EXPERIENCE, "Expériences professionnelles"),
        (EntryKind.SKILL, "Compétences"),
    ]


def test_ca07_fields_of_each_kind_follow_the_prd():
    assert _codes(EntryKind.QUALIFICATION) == ["qualification_type", "title", "organization", "start_month", "end_month"]
    assert _codes(EntryKind.TRAINING) == ["title", "organization", "start_month", "end_month", "duration_hours"]
    assert _codes(EntryKind.EXPERIENCE) == [
        "title", "organization", "location", "start_month", "end_month", "description",
    ]
    assert _codes(EntryKind.SKILL) == ["title", "skill_level"]


def test_ca07_required_fields():
    assert _required(EntryKind.QUALIFICATION) == ["qualification_type", "title", "organization", "start_month"]
    assert _required(EntryKind.TRAINING) == ["title", "organization", "start_month"]
    assert _required(EntryKind.EXPERIENCE) == ["title", "organization", "start_month"]
    assert _required(EntryKind.SKILL) == ["title", "skill_level"]


def test_ca07_labels_depend_on_the_kind():
    labels = {kind: {f.code: f.label for f in spec.fields} for kind, spec in ENTRY_KINDS.items()}

    assert labels[EntryKind.QUALIFICATION]["start_month"] == "Date d'obtention"
    assert labels[EntryKind.QUALIFICATION]["end_month"] == "Date d'expiration"
    assert labels[EntryKind.QUALIFICATION]["organization"] == "Établissement ou organisme"
    assert labels[EntryKind.EXPERIENCE]["title"] == "Poste"
    assert labels[EntryKind.EXPERIENCE]["organization"] == "Employeur"
    assert labels[EntryKind.SKILL]["title"] == "Compétence"
    assert labels[EntryKind.SKILL]["skill_level"] == "Niveau"


def test_ca07_lengths_bounds_and_choices():
    qualification = {f.code: f for f in ENTRY_KINDS[EntryKind.QUALIFICATION].fields}
    training = {f.code: f for f in ENTRY_KINDS[EntryKind.TRAINING].fields}
    experience = {f.code: f for f in ENTRY_KINDS[EntryKind.EXPERIENCE].fields}
    skill = {f.code: f for f in ENTRY_KINDS[EntryKind.SKILL].fields}

    assert (qualification["title"].min_length, qualification["title"].max_length) == (2, 150)
    assert (skill["title"].min_length, skill["title"].max_length) == (2, 60)
    assert experience["location"].max_length == 100
    assert (experience["description"].type, experience["description"].max_length) == (FieldType.LONG_TEXT, 500)
    assert (training["duration_hours"].type, training["duration_hours"].minimum, training["duration_hours"].maximum) == (
        FieldType.INTEGER, 1, 2000,
    )
    assert qualification["qualification_type"].choices == (
        (QualificationType.DIPLOME, "Diplôme"),
        (QualificationType.CERTIFICATION, "Certification"),
    )
    assert skill["skill_level"].choices == (
        (SkillLevel.BASIC, "Notions"),
        (SkillLevel.GOOD, "Bon niveau"),
        (SkillLevel.EXPERT, "Expert"),
    )


def test_ca07_conditional_end_and_open_end_labels():
    qualification = {f.code: f for f in ENTRY_KINDS[EntryKind.QUALIFICATION].fields}
    training = {f.code: f for f in ENTRY_KINDS[EntryKind.TRAINING].fields}
    experience = {f.code: f for f in ENTRY_KINDS[EntryKind.EXPERIENCE].fields}

    assert qualification["end_month"].only_when == ("qualification_type", QualificationType.CERTIFICATION)
    assert training["end_month"].open_label == "Formation en cours"
    assert experience["end_month"].open_label == "Poste actuel"


def test_proof_is_allowed_everywhere_except_for_skills():
    assert {kind: spec.allows_proof for kind, spec in ENTRY_KINDS.items()} == {
        EntryKind.QUALIFICATION: True,
        EntryKind.TRAINING: True,
        EntryKind.EXPERIENCE: True,
        EntryKind.SKILL: False,
    }


@pytest.mark.parametrize("kind", list(EntryKind))
def test_every_declared_field_exists_on_the_entity(kind):
    entity_fields = {field.name for field in fields(CareerEntry)}

    assert set(_codes(kind)) <= entity_fields
