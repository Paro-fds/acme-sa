"""US-11 — Vérifier ses modifications (T-11.1)."""

from tests.employees import EMP_A, EMP_E

URL = "/api/me/update"


def test_ca01_changes_come_with_label_section_old_and_new_values(employee_client, draft):
    draft(EMP_A, {"telephone_number": "+509 3722 2222", "address_line_1": "5 rue Pavée, Jacmel"})

    changes = employee_client(EMP_A).get(URL).json()["changes"]

    assert [
        (c["field_name"], c["label"], c["section"], c["old_value"], c["new_value"]) for c in changes
    ] == [
        ("telephone_number", "Téléphone", "CONTACT", "+50937221111", "+509 3722 2222"),
        ("address_line_1", "Adresse", "CONTACT", "12 rue Capois, Port-au-Prince", "5 rue Pavée, Jacmel"),
    ]
    assert all(c["changed_at"] for c in changes)


def test_ca01_changes_follow_the_registry_order(employee_client, draft):
    draft(EMP_A, {"address_line_1": "5 rue Pavée, Jacmel", "last_name": "JOSEPH-PAUL"})

    changes = employee_client(EMP_A).get(URL).json()["changes"]

    assert [c["field_name"] for c in changes] == ["last_name", "address_line_1"]


def test_ca04_no_change_returns_an_empty_list(employee_client, draft):
    draft(EMP_A)

    update = employee_client(EMP_A).get(URL).json()

    assert update["state"] == "IN_PROGRESS"
    assert update["changes"] == []


def test_ca06_empty_original_value_is_returned_empty(employee_client, draft):
    draft(EMP_E, {"email_address": "rose.etienne@exemple.test"})

    change = employee_client(EMP_E).get(URL).json()["changes"][0]

    assert (change["old_value"], change["new_value"]) == ("", "rose.etienne@exemple.test")
