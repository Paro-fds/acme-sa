"""US-09 — Modifier ses informations (Walking Skeleton : téléphone, CA-02, CA-05, CA-07, CA-09)."""

from tests.employees import EMP_A

URL = "/api/me/update/changes"


def test_ca02_phone_change_is_recorded_with_old_and_new_value(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "+509 3722 2222"}})

    assert response.status_code == 200
    change = container.updates.get_for_employee(EMP_A.id).changes["telephone_number"]
    assert change.old_value == "+50937221111"
    assert change.new_value == "+509 3722 2222"


def test_ca05_invalid_phone_is_rejected_and_nothing_is_saved(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "12ab"}})

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_FIELD",
        "message": "Saisissez un numéro valide, par exemple +509 3722 1111.",
        "field": "telephone_number",
    }
    assert container.updates.get_for_employee(EMP_A.id).changes == {}


def test_ca07_non_editable_field_is_refused(employee_client, draft):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {"debt_amount": "0"}})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "FIELD_NOT_EDITABLE"


def test_ca09_changes_require_an_open_update(employee_client):
    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "+50937222222"}})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_NOT_STARTED"
