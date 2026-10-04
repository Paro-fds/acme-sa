"""US-10 — Sauvegarder et reprendre un brouillon (T-10.1)."""

from tests.employees import EMP_A

CHANGES_URL = "/api/me/update/changes"
FIELDS_URL = "/api/me/update/fields"
UPDATE_URL = "/api/me/update"


def _values(client):
    return {f["code"]: f["value"] for f in client.get(FIELDS_URL).json()}


def test_ca01_saved_change_is_stored_and_reread(employee_client, draft, container):
    draft(EMP_A)
    client = employee_client(EMP_A)

    response = client.put(CHANGES_URL, json={"changes": {"telephone_number": "+509 3722 2222"}})

    assert response.status_code == 200
    assert container.updates.get_for_employee(EMP_A.id).changes["telephone_number"].new_value == "+509 3722 2222"
    assert _values(client)["telephone_number"] == "+509 3722 2222"


def test_ca01_successive_partial_saves_are_cumulative(employee_client, draft):
    draft(EMP_A)
    client = employee_client(EMP_A)

    client.put(CHANGES_URL, json={"changes": {"telephone_number": "+509 3722 2222"}})
    client.put(CHANGES_URL, json={"changes": {"address_line_1": "5 rue Pavée, Jacmel"}})

    values = _values(client)
    assert values["telephone_number"] == "+509 3722 2222"
    assert values["address_line_1"] == "5 rue Pavée, Jacmel"


def test_ca03_draft_is_found_again_after_a_new_session(employee_client, draft):
    draft(EMP_A)
    employee_client(EMP_A).put(
        CHANGES_URL, json={"changes": {"telephone_number": "+509 3722 2222", "address_line_1": "5 rue Pavée, Jacmel"}}
    )

    new_session = employee_client(EMP_A)
    update = new_session.get(UPDATE_URL).json()

    assert update["state"] == "IN_PROGRESS"
    assert {c["field_name"]: c["new_value"] for c in update["changes"]} == {
        "telephone_number": "+509 3722 2222",
        "address_line_1": "5 rue Pavée, Jacmel",
    }
    fields = {f["code"]: f for f in new_session.get(FIELDS_URL).json()}
    assert fields["telephone_number"]["modified"] and fields["address_line_1"]["modified"]


def test_ca04_valid_field_saved_alone_while_an_invalid_one_is_kept_on_screen(employee_client, draft, container):
    """L'écran n'envoie que l'adresse ; l'API l'enregistre seule."""
    draft(EMP_A)

    response = employee_client(EMP_A).put(CHANGES_URL, json={"changes": {"address_line_1": "5 rue Pavée, Jacmel"}})

    assert response.status_code == 200
    assert list(container.updates.get_for_employee(EMP_A.id).changes) == ["address_line_1"]


def test_ca06_updated_at_changes_on_each_save(employee_client, clock, draft):
    draft(EMP_A)
    client = employee_client(EMP_A)

    clock.advance(minutes=3)
    first = client.put(CHANGES_URL, json={"changes": {"telephone_number": "+509 3722 2222"}}).json()
    clock.advance(minutes=4)
    second = client.put(CHANGES_URL, json={"changes": {"address_line_1": "5 rue Pavée, Jacmel"}}).json()

    assert first["updated_at"].startswith("2026-10-04T09:03:00")
    assert second["updated_at"].startswith("2026-10-04T09:07:00")
    assert client.get(UPDATE_URL).json()["updated_at"] == second["updated_at"]
