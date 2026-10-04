"""US-05 — Consulter son profil (Walking Skeleton : CA-01, CA-02, CA-03, CA-06)."""

from tests.employees import EMP_A, EMP_B, SECRET_MARKER

URL = "/api/me/profile"


def test_ca01_profile_contains_the_employee_information(employee_client):
    response = employee_client(EMP_A).get(URL)

    assert response.status_code == 200
    profile = response.json()
    assert profile["employee_code"] == "AC-1001"
    assert profile["last_name"] == "JOSEPH"
    assert profile["first_name"] == "Jean"
    assert profile["birth_date"] == "1996-03-15"
    assert profile["agency_code"] == "PV"
    assert profile["position"] == "Agent de crédit"
    assert profile["telephone_number"] == "+50937221111"
    assert profile["update"]["state"] == "NOT_DONE"


def test_ca02_only_the_connected_employee_data_is_returned(employee_client):
    profile = employee_client(EMP_B).get(URL).json()

    assert profile["employee_code"] == EMP_B.employee_code
    assert profile["last_name"] == "BAPTISTE"


def test_ca03_no_excluded_column_is_exposed(employee_client):
    response = employee_client(EMP_A).get(URL)

    assert SECRET_MARKER not in response.text
    for excluded in ("debt_amount", "credit_account_number", "acme_payroll_account_number", "id_card_code", "latitude"):
        assert excluded not in response.json()


def test_ca06_profile_requires_a_session(client):
    response = client.get(URL)

    assert response.status_code == 401
