"""US-12 — Confirmer et soumettre."""

import hashlib

import pytest

from tests.employees import EMP_A

URL = "/api/me/update/submit"
NEW_PHONE = "+50937222222"
NEW_ADDRESS = "5 rue Pavée, Jacmel"


# --- CA-01 : confirmation obligatoire ------------------------------------------


@pytest.mark.parametrize("payload", [{"confirmed": False}, {}])
def test_ca01_confirmation_is_required(employee_client, draft, container, payload):
    draft(EMP_A, {"telephone_number": NEW_PHONE})

    response = employee_client(EMP_A).post(URL, json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] in {"CONFIRMATION_REQUIRED", "INVALID_INPUT"}
    assert not container.updates.get_for_employee(EMP_A.id).is_submitted


def test_ca01_false_confirmation_gives_the_dedicated_code(employee_client, draft):
    draft(EMP_A)

    response = employee_client(EMP_A).post(URL, json={"confirmed": False})

    assert response.json()["error"]["code"] == "CONFIRMATION_REQUIRED"


def test_submission_requires_an_open_update(employee_client):
    response = employee_client(EMP_A).post(URL, json={"confirmed": True})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_NOT_STARTED"


# --- CA-02, CA-03, CA-05 : soumission ------------------------------------------


def test_ca02_submission_marks_the_update_as_done_with_its_date(employee_client, clock, draft, container):
    draft(EMP_A, {"telephone_number": NEW_PHONE, "address_line_1": NEW_ADDRESS})
    clock.advance(minutes=10)

    response = employee_client(EMP_A).post(URL, json={"confirmed": True})

    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "DONE"
    assert body["submitted_at"].startswith("2026-10-04T09:10:00")
    update = container.updates.get_for_employee(EMP_A.id)
    assert update.status == "SUBMITTED"


def test_ca02_admin_sees_the_employee_as_updated(employee_client, draft, admin_client):
    draft(EMP_A, {"telephone_number": NEW_PHONE})
    employee_client(EMP_A).post(URL, json={"confirmed": True})

    items = admin_client.get("/api/admin/employees").json()["items"]

    assert next(item for item in items if item["id"] == EMP_A.id)["status"] == "UPDATED"


def test_ca03_history_keeps_old_and_new_values_and_dates(employee_client, clock, draft, container):
    draft(EMP_A, {"telephone_number": NEW_PHONE, "address_line_1": NEW_ADDRESS})
    clock.advance(minutes=10)

    employee_client(EMP_A).post(URL, json={"confirmed": True})

    changes = container.updates.get_for_employee(EMP_A.id).changes
    assert {code: (c.old_value, c.new_value) for code, c in changes.items()} == {
        "telephone_number": ("+50937221111", NEW_PHONE),
        "address_line_1": ("12 rue Capois, Port-au-Prince", NEW_ADDRESS),
    }
    assert all(c.changed_at.isoformat().startswith("2026-10-04T09:00:00") for c in changes.values())


def test_ca05_submission_without_any_change_is_accepted(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).post(URL, json={"confirmed": True})

    assert response.status_code == 200
    assert response.json()["state"] == "DONE"
    assert response.json()["changes"] == []
    assert container.updates.get_for_employee(EMP_A.id).is_submitted


# --- CA-04, CA-06 : plus aucune écriture après la soumission --------------------
# Les routes des documents (POST / DELETE /api/me/documents) arrivent avec US-13 / US-14,
# qui vérifieront aussi ce verrouillage.

WRITES_AFTER_SUBMISSION = [
    ("put", "/api/me/update/changes", {"changes": {"telephone_number": "+50937229999"}}),
    ("put", "/api/me/update/changes", {"changes": {}}),
    ("post", "/api/me/update/decision", {"accepted": True}),
    ("post", "/api/me/update/decision", {"accepted": False}),
    ("post", URL, {"confirmed": True}),
]


@pytest.mark.parametrize(("method", "url", "payload"), WRITES_AFTER_SUBMISSION)
def test_ca04_every_write_is_refused_after_submission(employee_client, submitted, container, method, url, payload):
    submitted(EMP_A, {"telephone_number": NEW_PHONE})
    before = container.updates.get_for_employee(EMP_A.id)

    response = getattr(employee_client(EMP_A), method)(url, json=payload)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_ALREADY_SUBMITTED"
    after = container.updates.get_for_employee(EMP_A.id)
    assert (after.status, after.submitted_at, after.updated_at) == (before.status, before.submitted_at, before.updated_at)
    assert after.changes["telephone_number"].new_value == NEW_PHONE


def test_ca04_editable_fields_are_no_longer_served_after_submission(employee_client, submitted):
    submitted(EMP_A, {"telephone_number": NEW_PHONE})

    response = employee_client(EMP_A).get("/api/me/update/fields")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_ALREADY_SUBMITTED"


def test_ca04_submitted_update_can_still_be_read(employee_client, submitted):
    submitted(EMP_A, {"telephone_number": NEW_PHONE})

    response = employee_client(EMP_A).get("/api/me/update")

    assert response.status_code == 200
    assert response.json()["state"] == "DONE"


def test_ca06_double_submission_records_a_single_submission(employee_client, clock, draft, container):
    draft(EMP_A, {"telephone_number": NEW_PHONE})
    client = employee_client(EMP_A)

    first = client.post(URL, json={"confirmed": True})
    clock.advance(seconds=1)
    second = client.post(URL, json={"confirmed": True})

    assert first.status_code == 200
    assert second.status_code == 409
    assert container.updates.get_for_employee(EMP_A.id).submitted_at.isoformat().startswith("2026-10-04T09:00:00")


# --- CA-07 : le CSV source n'est jamais modifié ---------------------------------


def _fingerprint(path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_ca07_source_csv_is_unchanged_after_submission(employee_client, draft, settings):
    before = _fingerprint(settings.acme_csv_path)
    draft(EMP_A, {"telephone_number": NEW_PHONE, "last_name": "JOSEPH-PAUL"})

    employee_client(EMP_A).post(URL, json={"confirmed": True})

    assert _fingerprint(settings.acme_csv_path) == before
