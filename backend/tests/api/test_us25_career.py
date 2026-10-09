"""US-25 — Consulter son parcours (T-25.3)."""

from datetime import timedelta

from app.career.domain.entry_kinds import EntryKind, QualificationType, SkillLevel
from app.career.domain.months import Month
from tests.employees import EMP_A, EMP_B, EMP_E, SECRET_MARKER

URL = "/api/me/career"
FIELDS_URL = "/api/me/career/fields"
KINDS = ["QUALIFICATION", "TRAINING", "EXPERIENCE", "SKILL"]


def _kinds(body):
    return {kind["kind"]: kind for kind in body["kinds"]}


def _titles(body, kind):
    return [item["title"] for item in _kinds(body)[kind]["items"]]


# --- CA-01 : parcours vide ----------------------------------------------------------


def test_ca01_empty_career_has_the_four_kinds_in_order(employee_client):
    response = employee_client(EMP_E).get(URL)

    assert response.status_code == 200
    body = response.json()
    assert [(kind["kind"], kind["label"], kind["count"], kind["limit"], kind["items"]) for kind in body["kinds"]] == [
        ("QUALIFICATION", "Diplômes et certifications", 0, 30, []),
        ("TRAINING", "Formations suivies", 0, 30, []),
        ("EXPERIENCE", "Expériences professionnelles", 0, 30, []),
        ("SKILL", "Compétences", 0, 30, []),
    ]
    assert body["last_changed_at"] is None


# --- CA-02 : parcours rempli et trié ---------------------------------------------------


def test_ca02_entries_are_sorted_and_counted(employee_client, career_entry):
    career_entry(EMP_A, EntryKind.EXPERIENCE, title="Caissier", start_month=Month(2016, 1), end_month=Month(2019, 12))
    career_entry(EMP_A, EntryKind.EXPERIENCE, title="Agent de crédit", start_month=Month(2020, 1), end_month=None)
    career_entry(EMP_A, EntryKind.QUALIFICATION, title="Baccalauréat", start_month=Month(2015, 7))
    career_entry(EMP_A, EntryKind.QUALIFICATION, title="Licence", start_month=Month(2021, 6))

    body = employee_client(EMP_A).get(URL).json()

    assert _titles(body, "EXPERIENCE") == ["Agent de crédit", "Caissier"]
    assert _titles(body, "QUALIFICATION") == ["Licence", "Baccalauréat"]
    assert [kind["count"] for kind in body["kinds"]] == [2, 0, 2, 0]


def test_ca02_entry_content(employee_client, career_entry):
    career_entry(
        EMP_A, EntryKind.QUALIFICATION, qualification_type=QualificationType.CERTIFICATION, title="Certification AML",
        organization="ACAMS", start_month=Month(2024, 3), end_month=Month(2027, 3),
    )
    career_entry(EMP_A, EntryKind.SKILL, title="Analyse de crédit", skill_level=SkillLevel.EXPERT)

    kinds = _kinds(employee_client(EMP_A).get(URL).json())
    certification = kinds["QUALIFICATION"]["items"][0]
    skill = kinds["SKILL"]["items"][0]

    assert {key: certification[key] for key in (
        "kind", "qualification_type", "qualification_type_label", "title", "organization", "start_month", "end_month",
        "location", "duration_hours", "description", "skill_level", "proof",
    )} == {
        "kind": "QUALIFICATION",
        "qualification_type": "CERTIFICATION",
        "qualification_type_label": "Certification",
        "title": "Certification AML",
        "organization": "ACAMS",
        "start_month": "2024-03",
        "end_month": "2027-03",
        "location": None,
        "duration_hours": None,
        "description": None,
        "skill_level": None,
        "proof": None,
    }
    assert certification["created_at"].startswith("2026-10-15T09:00:00")
    assert (skill["skill_level"], skill["skill_level_label"], skill["start_month"]) == ("EXPERT", "Expert", None)


def test_last_changed_at_is_the_date_of_the_latest_write(employee_client, career_entry):
    first = career_entry(EMP_A, EntryKind.SKILL, title="Excel")
    career_entry(EMP_A, EntryKind.SKILL, title="Anglais", updated_at=first.updated_at + timedelta(days=2))

    body = employee_client(EMP_A).get(URL).json()

    assert body["last_changed_at"].startswith("2026-10-17T09:00:00")


# --- CA-04 : indépendant de la campagne ---------------------------------------------------


def test_ca04_available_whatever_the_campaign_state(employee_client, submitted, career_entry, admin_client):
    submitted(EMP_A, {"telephone_number": "+50937220000"})
    statistics = admin_client.get("/api/admin/statistics").json()
    career_entry(EMP_A, EntryKind.SKILL)

    response = employee_client(EMP_A).get(URL)

    assert response.status_code == 200
    assert _titles(response.json(), "SKILL") == ["Analyse de crédit"]
    assert admin_client.get("/api/admin/statistics").json() == statistics


# --- CA-05 : isolation ----------------------------------------------------------------


def test_ca05_only_the_employee_s_own_entries(employee_client, career_reference):
    body = employee_client(EMP_B).get(URL).json()

    assert _titles(body, "SKILL") == ["Anglais"]
    assert _titles(body, "TRAINING") == ["Crédit aux PME"]
    assert _titles(body, "QUALIFICATION") == []
    assert _titles(body, "EXPERIENCE") == []


def test_no_excluded_csv_column_in_the_answers(employee_client, career_reference):
    client = employee_client(EMP_A)

    assert SECRET_MARKER not in client.get(URL).text
    assert SECRET_MARKER not in client.get(FIELDS_URL).text


# --- CA-06 : session exigée -----------------------------------------------------------------


def test_ca06_session_required(client):
    assert client.get(URL).status_code == 401
    assert client.get(FIELDS_URL).status_code == 401


def test_ca06_admin_session_is_not_an_employee_session(admin_client):
    assert admin_client.get(URL).status_code == 401


# --- CA-07 : registre --------------------------------------------------------------------


def test_ca07_fields_registry(employee_client):
    response = employee_client(EMP_A).get(FIELDS_URL)

    assert response.status_code == 200
    body = response.json()
    assert body["limit"] == 30
    kinds = {kind["kind"]: kind for kind in body["kinds"]}
    assert list(kinds) == KINDS
    assert [kinds[kind]["allows_proof"] for kind in KINDS] == [True, True, True, False]

    qualification = {field["code"]: field for field in kinds["QUALIFICATION"]["fields"]}
    assert list(qualification) == ["qualification_type", "title", "organization", "start_month", "end_month"]
    assert qualification["qualification_type"] == {
        "code": "qualification_type",
        "label": "Type",
        "type": "CHOICE",
        "required": True,
        "min_length": None,
        "max_length": None,
        "minimum": None,
        "maximum": None,
        "choices": [{"value": "DIPLOME", "label": "Diplôme"}, {"value": "CERTIFICATION", "label": "Certification"}],
        "only_when": None,
        "open_label": None,
    }
    assert qualification["end_month"]["only_when"] == {"field": "qualification_type", "value": "CERTIFICATION"}
    assert (qualification["title"]["min_length"], qualification["title"]["max_length"]) == (2, 150)

    training = {field["code"]: field for field in kinds["TRAINING"]["fields"]}
    assert (training["duration_hours"]["type"], training["duration_hours"]["minimum"], training["duration_hours"]["maximum"]) == (
        "INTEGER", 1, 2000,
    )
    assert training["end_month"]["open_label"] == "Formation en cours"

    skill = {field["code"]: field for field in kinds["SKILL"]["fields"]}
    assert [choice["label"] for choice in skill["skill_level"]["choices"]] == ["Notions", "Bon niveau", "Expert"]


def test_limit_comes_from_the_configuration(app, employee_client):
    app.state.container.settings.max_career_entries_per_kind = 12

    client = employee_client(EMP_A)

    assert client.get(FIELDS_URL).json()["limit"] == 12
    assert {kind["limit"] for kind in client.get(URL).json()["kinds"]} == {12}
