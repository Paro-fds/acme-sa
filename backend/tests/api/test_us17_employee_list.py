"""US-17 — Consulter la liste des employés (T-17.1, T-17.2)."""

import csv
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.main import create_app
from tests.conftest import TEST_CSV, admin_session
from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_B, EMP_E, EMP_I

URL = "/api/admin/employees"


# --- CA-01 : liste ---------------------------------------------------------------------


def test_ca01_lists_active_employees_sorted_with_their_status(admin_client, submitted):
    submitted(EMP_A, {"telephone_number": "+50937222222"})

    body = admin_client.get(URL).json()

    assert body["total"] == len(ACTIVE_EMPLOYEES) == 7
    assert (body["page"], body["page_size"], body["page_count"]) == (1, 20, 1)
    names = [(item["last_name"], item["first_name"]) for item in body["items"]]
    assert names == [
        ("BAPTISTE", "Marc"),
        ("ÉTIENNE", "Rosé"),
        ("JOSEPH", "Jean"),
        ("LOUIS", "Paul"),
        ("LOUIS", "Paul"),
        ("PIERRE", "Marie"),
        ("PIERRE", "Marie"),
    ]
    statuses = {item["id"]: item["status"] for item in body["items"]}
    assert statuses[EMP_A.id] == "UPDATED"
    assert {status for employee_id, status in statuses.items() if employee_id != EMP_A.id} == {"NOT_UPDATED"}
    assert EMP_I.id not in statuses


def test_ca01_each_row_has_name_code_agency_and_status(admin_client):
    item = next(item for item in admin_client.get(URL).json()["items"] if item["id"] == EMP_A.id)

    assert item == {
        "id": EMP_A.id,
        "employee_code": "AC-1001",
        "last_name": "JOSEPH",
        "first_name": "Jean",
        "display_name": "JOSEPH Jean",
        "previous_name": None,
        "agency_code": "PV",
        "position": "Agent de crédit",
        "status": "NOT_UPDATED",
    }


def test_ca01_draft_is_shown_as_not_updated_with_the_reference_name(admin_client, draft):
    draft(EMP_B, {"last_name": "BAPTISTE-NOUVEAU"})

    item = next(item for item in admin_client.get(URL).json()["items"] if item["id"] == EMP_B.id)

    assert item["status"] == "NOT_UPDATED"
    assert item["display_name"] == "BAPTISTE Marc"
    assert item["previous_name"] is None


def test_list_never_exposes_sensitive_columns(admin_client):
    assert "FAKE-SECRET" not in admin_client.get(URL).text


# --- CA-03 : nom modifié (T-17.2) ------------------------------------------------------


def test_ca03_submitted_last_name_is_shown_with_the_previous_one(admin_client, submitted):
    submitted(EMP_A, {"last_name": "JOSEPH-PAUL"})

    item = next(item for item in admin_client.get(URL).json()["items"] if item["id"] == EMP_A.id)

    assert item["last_name"] == "JOSEPH-PAUL"
    assert item["display_name"] == "JOSEPH-PAUL Jean"
    assert item["previous_name"] == "JOSEPH"


def test_ca03_submitted_first_name_is_shown_with_the_previous_one(admin_client, submitted):
    submitted(EMP_E, {"first_name": "Rose-Marie"})

    item = next(item for item in admin_client.get(URL).json()["items"] if item["id"] == EMP_E.id)

    assert item["display_name"] == "ÉTIENNE Rose-Marie"
    assert item["previous_name"] == "Rosé"


def test_ca03_both_names_changed(admin_client, submitted):
    submitted(EMP_A, {"last_name": "PAUL", "first_name": "Jean-Marc"})

    item = next(item for item in admin_client.get(URL).json()["items"] if item["id"] == EMP_A.id)

    assert item["display_name"] == "PAUL Jean-Marc"
    assert item["previous_name"] == "JOSEPH Jean"


def test_ca03_list_is_sorted_by_the_new_name(admin_client, submitted):
    submitted(EMP_A, {"last_name": "AARON"})

    assert admin_client.get(URL).json()["items"][0]["id"] == EMP_A.id


def test_ca03_other_changes_do_not_produce_a_previous_name(admin_client, submitted):
    submitted(EMP_A, {"telephone_number": "+50937222222"})

    item = next(item for item in admin_client.get(URL).json()["items"] if item["id"] == EMP_A.id)

    assert item["previous_name"] is None


# --- CA-02 : pagination (fixture de 45 employés actifs) --------------------------------


@pytest.fixture
def csv_45(tmp_path: Path) -> Path:
    """45 employés actifs (+ 1 inactif), construits à partir de la première ligne du CSV de test."""
    with TEST_CSV.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        fieldnames = reader.fieldnames
        template = next(reader)
    path = tmp_path / "employees_45.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fieldnames)
        writer.writeheader()
        for number in range(1, 47):
            writer.writerow(
                {
                    **template,
                    "id": str(5000 + number),
                    "employee_code": f"AC-{5000 + number}",
                    "last_name": f"NOM{number:02d}",
                    "active": "false" if number == 46 else "true",
                }
            )
    return path


@pytest.fixture
def admin_45(settings, csv_45):
    app = create_app(settings.model_copy(update={"acme_csv_path": csv_45}))
    token = admin_session(app.state.container)
    try:
        with TestClient(app, cookies={SESSION_COOKIE: token}) as client:
            yield client
    finally:
        app.state.container.close()


def test_ca02_first_page_has_20_employees(admin_45):
    body = admin_45.get(URL, params={"page": 1}).json()

    assert body["total"] == 45
    assert body["page_count"] == 3
    assert [item["last_name"] for item in body["items"]] == [f"NOM{number:02d}" for number in range(1, 21)]


def test_ca02_last_page_has_5_employees(admin_45):
    body = admin_45.get(URL, params={"page": 3}).json()

    assert [item["last_name"] for item in body["items"]] == [f"NOM{number:02d}" for number in range(41, 46)]
    assert body["page"] == 3


def test_ca02_page_after_the_last_is_empty(admin_45):
    body = admin_45.get(URL, params={"page": 4}).json()

    assert body["items"] == []
    assert body["total"] == 45


@pytest.mark.parametrize("params", [{"page": 0}, {"page": "x"}, {"page_size": 0}, {"page_size": 101}])
def test_ca02_invalid_pagination_gives_422(admin_client, params):
    assert admin_client.get(URL, params=params).status_code == 422


def test_ca02_no_employee_gives_one_empty_page(admin_client, container):
    container.employees.list_all = lambda: []

    body = admin_client.get(URL).json()

    assert (body["items"], body["total"], body["page_count"]) == ([], 0, 1)
