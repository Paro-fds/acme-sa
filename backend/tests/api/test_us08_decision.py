"""US-08 — Choisir de mettre à jour ou non."""

from tests.employees import EMP_A

URL = "/api/me/update/decision"


def test_ca01_yes_opens_a_draft(employee_client, container):
    response = employee_client(EMP_A).post(URL, json={"accepted": True})

    assert response.status_code == 200
    assert response.json()["state"] == "IN_PROGRESS"
    update = container.updates.get_for_employee(EMP_A.id)
    assert update.accepted is True
    assert update.status == "DRAFT"


def test_ca02_no_is_recorded_and_the_state_stays_not_done(employee_client, container):
    response = employee_client(EMP_A).post(URL, json={"accepted": False})

    assert response.status_code == 200
    assert response.json()["state"] == "NOT_DONE"
    assert response.json()["accepted"] is False
    update = container.updates.get_for_employee(EMP_A.id)
    assert update.accepted is False
    assert update.status == "DRAFT"


def test_ca02_no_keeps_the_admin_status_not_updated(employee_client, admin_client):
    employee_client(EMP_A).post(URL, json={"accepted": False})

    items = admin_client.get("/api/admin/employees").json()["items"]

    assert next(item for item in items if item["id"] == EMP_A.id)["status"] == "NOT_UPDATED"


def test_ca03_yes_after_no_opens_a_draft(employee_client, container):
    client = employee_client(EMP_A)
    client.post(URL, json={"accepted": False})

    response = client.post(URL, json={"accepted": True})

    assert response.status_code == 200
    assert response.json()["state"] == "IN_PROGRESS"
    assert container.updates.get_for_employee(EMP_A.id).accepted is True


def test_ca04_decision_after_submission_is_rejected(employee_client, submitted, container):
    submitted(EMP_A, {"telephone_number": "+509 3722 2222"})

    for accepted in (True, False):
        response = employee_client(EMP_A).post(URL, json={"accepted": accepted})
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "UPDATE_ALREADY_SUBMITTED"

    update = container.updates.get_for_employee(EMP_A.id)
    assert update.is_submitted
    assert update.accepted is True


def test_ca05_yes_again_keeps_the_existing_draft(employee_client, draft):
    draft(EMP_A, {"telephone_number": "+509 3722 2222"})

    response = employee_client(EMP_A).post(URL, json={"accepted": True})

    changes = response.json()["changes"]
    assert [(c["field_name"], c["new_value"]) for c in changes] == [("telephone_number", "+509 3722 2222")]


def test_decision_requires_a_boolean(employee_client):
    response = employee_client(EMP_A).post(URL, json={"accepted": "peut-être"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_INPUT"


def test_decision_requires_a_session(client):
    assert client.post(URL, json={"accepted": True}).status_code == 401
