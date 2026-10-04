"""US-15 — Connexion administrateur (Walking Skeleton : CA-01, CA-02, CA-04, CA-05)."""

from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A

LOGIN_URL = "/api/admin/auth/login"


def test_ca01_admin_login_opens_an_admin_session(client):
    response = client.post(LOGIN_URL, json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})

    assert response.status_code == 204
    assert client.get("/api/admin/employees").status_code == 200


def test_ca02_wrong_credentials_are_rejected_without_detail(client):
    response = client.post(LOGIN_URL, json={"username": ADMIN_USERNAME, "password": "mauvais"})

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Identifiant ou mot de passe incorrect."


def test_ca04_employee_session_cannot_reach_admin_routes(employee_client, admin_client):
    assert employee_client(EMP_A).get("/api/admin/employees").status_code == 403
    assert admin_client.get("/api/me/profile").status_code == 401


def test_ca05_admin_routes_require_a_session(client):
    assert client.get("/api/admin/employees").status_code == 401
