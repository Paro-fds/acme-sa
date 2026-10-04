"""US-12 — Confirmer et soumettre (Walking Skeleton : CA-01, CA-02, CA-03)."""

from tests.employees import EMP_A

URL = "/api/me/update/submit"
NEW_PHONE = "+50937222222"


def test_ca01_confirmation_is_required(employee_client, draft):
    draft(EMP_A, {"telephone_number": NEW_PHONE})

    response = employee_client(EMP_A).post(URL, json={"confirmed": False})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CONFIRMATION_REQUIRED"


def test_ca02_submission_marks_the_update_as_done(employee_client, draft):
    draft(EMP_A, {"telephone_number": NEW_PHONE})

    response = employee_client(EMP_A).post(URL, json={"confirmed": True})

    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "DONE"
    assert body["submitted_at"] is not None


def test_ca03_history_keeps_old_and_new_values(employee_client, draft, container):
    draft(EMP_A, {"telephone_number": NEW_PHONE})

    employee_client(EMP_A).post(URL, json={"confirmed": True})

    change = container.updates.get_for_employee(EMP_A.id).changes["telephone_number"]
    assert (change.old_value, change.new_value) == ("+50937221111", NEW_PHONE)
    assert change.changed_at is not None
