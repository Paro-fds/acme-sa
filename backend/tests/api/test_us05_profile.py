"""US-05 — Consulter son profil."""

from tests.employees import EMP_A, EMP_B, EMP_E, SECRET_MARKER

URL = "/api/me/profile"


def test_ca01_profile_contains_the_employee_information(employee_client):
    response = employee_client(EMP_A).get(URL)

    assert response.status_code == 200
    profile = response.json()
    assert profile["employee_code"] == "AC-1001"
    assert profile["last_name"] == "JOSEPH"
    assert profile["first_name"] == "Jean"
    assert profile["birth_date"] == "1996-03-15"
    assert set(profile["affectation"]) == {"agency", "region", "direction"}  # US-201 : libellés, jamais le code brut
    assert profile["position"] == "Agent de crédit"
    assert profile["telephone_number"] == "+50937221111"
    assert profile["gender"] == "M"
    assert profile["grade"] == "12"
    assert profile["level"] == "2"
    assert profile["contract_nature"] == "CDI"
    assert profile["update"]["state"] == "NOT_DONE"


def test_ca01_editable_fields_are_listed(employee_client):
    profile = employee_client(EMP_A).get(URL).json()

    # US-206 : l'employé ne modifie plus que ses coordonnées (section 1 / 3 du profil).
    assert profile["editable_fields"] == [
        "telephone_number",
        "email_address",
        "address_line_1",
    ]


def test_ca02_only_the_connected_employee_data_is_returned(employee_client):
    profile = employee_client(EMP_B).get(URL).json()

    assert profile["employee_code"] == EMP_B.employee_code
    assert profile["last_name"] == "BAPTISTE"


def test_ca02_no_route_gives_access_to_another_employee_profile(employee_client):
    connected = employee_client(EMP_A)

    for url in (f"/api/me/profile/{EMP_B.id}", f"/api/employees/{EMP_B.id}", f"/api/me/profile?id={EMP_B.id}"):
        response = connected.get(url)
        assert EMP_B.last_name not in response.text, url


def test_ca03_no_excluded_column_is_exposed(employee_client):
    response = employee_client(EMP_A).get(URL)

    assert SECRET_MARKER not in response.text
    for excluded in ("debt_amount", "credit_account_number", "acme_payroll_account_number", "id_card_code", "latitude"):
        assert excluded not in response.json()


def test_ca06_profile_requires_a_session(client):
    response = client.get(URL)

    assert response.status_code == 401


def test_ca04_empty_field_is_returned_empty(employee_client):
    profile = employee_client(EMP_E).get(URL).json()

    assert profile["email_address"] == ""


def test_ca05_submitted_value_replaces_the_reference_value(employee_client, submitted):
    submitted(EMP_A, {"telephone_number": "+509 3722 2222"})

    profile = employee_client(EMP_A).get(URL).json()

    assert profile["telephone_number"] == "+509 3722 2222"


def test_ca05_draft_value_is_not_shown_in_the_profile(employee_client, draft):
    draft(EMP_A, {"telephone_number": "+509 3722 2222"})

    profile = employee_client(EMP_A).get(URL).json()

    assert profile["telephone_number"] == "+50937221111"
