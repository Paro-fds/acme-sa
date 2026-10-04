"""US-09 — Modifier ses informations."""

import pytest

from tests.employees import EMP_A, EMP_E

URL = "/api/me/update/changes"
FIELDS_URL = "/api/me/update/fields"


def _changes(container, employee=EMP_A):
    update = container.updates.get_for_employee(employee.id)
    return {code: (c.old_value, c.new_value) for code, c in update.changes.items()}


# --- CA-01 : formulaire pré-rempli -------------------------------------------


def test_ca01_fields_return_the_registry_with_current_values(employee_client, draft):
    draft(EMP_A)

    fields = employee_client(EMP_A).get(FIELDS_URL).json()

    assert [(f["code"], f["label"], f["section"], f["required"]) for f in fields] == [
        ("last_name", "Nom", "IDENTITY", True),
        ("first_name", "Prénom", "IDENTITY", True),
        ("telephone_number", "Téléphone", "CONTACT", True),
        ("email_address", "Email", "CONTACT", False),
        ("address_line_1", "Adresse", "CONTACT", False),
    ]
    phone = next(f for f in fields if f["code"] == "telephone_number")
    assert phone == {**phone, "original_value": "+50937221111", "value": "+50937221111", "modified": False}


def test_ca01_fields_show_the_draft_value_and_the_original_value(employee_client, draft):
    draft(EMP_A, {"telephone_number": "+509 3722 2222"})

    fields = employee_client(EMP_A).get(FIELDS_URL).json()

    phone = next(f for f in fields if f["code"] == "telephone_number")
    assert (phone["original_value"], phone["value"], phone["modified"]) == ("+50937221111", "+509 3722 2222", True)


# --- CA-02, CA-04, CA-08 : enregistrement ------------------------------------


def test_ca02_phone_change_is_recorded_with_old_and_new_value(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "+509 3722 2222"}})

    assert response.status_code == 200
    assert _changes(container) == {"telephone_number": ("+50937221111", "+509 3722 2222")}


def test_ca02_several_changes_are_recorded(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(
        URL, json={"changes": {"telephone_number": "+509 3722 2222", "address_line_1": "5 rue Pavée, Jacmel"}}
    )

    assert response.status_code == 200
    assert len(response.json()["changes"]) == 2
    assert _changes(container)["address_line_1"][1] == "5 rue Pavée, Jacmel"
    assert len(_changes(container)) == 2


def test_ca04_original_value_removes_the_change(employee_client, draft, container):
    draft(EMP_A, {"telephone_number": "+509 3722 2222"})

    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "+50937221111"}})

    assert response.status_code == 200
    assert response.json()["changes"] == []
    assert _changes(container) == {}


def test_ca08_empty_source_email_is_recorded_with_an_empty_old_value(employee_client, draft, container):
    draft(EMP_E)

    employee_client(EMP_E).put(URL, json={"changes": {"email_address": "rose.etienne@exemple.test"}})

    assert _changes(container, EMP_E) == {"email_address": ("", "rose.etienne@exemple.test")}


# --- CA-05, CA-06, CA-07 : refus -----------------------------------------------


def test_ca05_invalid_phone_is_rejected_and_nothing_is_saved(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "12ab"}})

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_FIELD",
        "message": "Saisissez un numéro valide, par exemple +509 3722 1111.",
        "field": "telephone_number",
    }
    assert _changes(container) == {}


def test_ca05_one_invalid_field_rejects_the_whole_request(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(
        URL, json={"changes": {"telephone_number": "+509 3722 2222", "email_address": "jean@"}}
    )

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "email_address"
    assert _changes(container) == {}


@pytest.mark.parametrize("code", ["last_name", "first_name", "telephone_number"])
def test_ca06_required_field_cannot_be_emptied(employee_client, draft, code):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {code: "  "}})

    assert response.status_code == 422
    assert response.json()["error"] == {"code": "INVALID_FIELD", "message": "Ce champ est obligatoire.", "field": code}


@pytest.mark.parametrize("code", ["position", "debt_amount", "birth_date"])
def test_ca07_non_editable_field_is_refused(employee_client, draft, container, code):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {code: "0", "telephone_number": "+509 3722 2222"}})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "FIELD_NOT_EDITABLE"
    assert response.json()["error"]["field"] == code
    assert _changes(container) == {}


# --- CA-09 : mise à jour non ouverte -------------------------------------------


def test_ca09_changes_require_an_open_update(employee_client):
    response = employee_client(EMP_A).put(URL, json={"changes": {"telephone_number": "+50937222222"}})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_NOT_STARTED"


def test_ca09_changes_are_refused_after_answering_no(employee_client):
    client = employee_client(EMP_A)
    client.post("/api/me/update/decision", json={"accepted": False})

    response = client.put(URL, json={"changes": {"telephone_number": "+50937222222"}})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_NOT_STARTED"


def test_ca09_fields_require_an_open_update(employee_client):
    response = employee_client(EMP_A).get(FIELDS_URL)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_NOT_STARTED"


def test_fields_require_a_session(client):
    assert client.get(FIELDS_URL).status_code == 401


def test_saving_without_any_change_is_accepted(employee_client, draft, container):
    draft(EMP_A)

    response = employee_client(EMP_A).put(URL, json={"changes": {}})

    assert response.status_code == 200
    assert _changes(container) == {}
