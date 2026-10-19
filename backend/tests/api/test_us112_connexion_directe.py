"""US-112 — Se connecter à l'espace de gestion sans code (double authentification coupée par réglage)."""

import pytest

from app.config import Settings
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME

LOGIN_URL = "/api/admin/auth/login"
OPTIONS_URL = "/api/auth/admin-options"
GOOD = {"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
BAD = {"username": ADMIN_USERNAME, "password": "mauvais"}


@pytest.fixture
def settings(settings: Settings) -> Settings:
    """Les autres tests gardent la double authentification ; ici, le réglage est coupé."""
    return settings.model_copy(update={"admin_mfa_required": False})


def test_ca01_the_setting_is_off_by_default():
    assert Settings.model_fields["admin_mfa_required"].default is False


def test_ca02_the_password_alone_opens_the_management_space(client, container):
    response = client.post(LOGIN_URL, json=GOOD)

    assert response.status_code == 204
    assert client.get("/api/admin/me").status_code == 200
    assert client.get("/api/admin/dashboard").status_code == 200
    assert container.admin_accounts.find_by_username(ADMIN_USERNAME).last_login_at is not None


def test_ca02_every_role_connects_directly(client, admin_client):
    created = admin_client.post(
        "/api/admin/admins",
        json={"username": "agent.rh", "password": "Provisoire-2026!", "role": "AGENT_RH"},
    )
    assert created.status_code < 300, created.text

    assert client.post(LOGIN_URL, json={"username": "agent.rh", "password": "Provisoire-2026!"}).status_code == 204


def test_ca03_wrong_password_and_lockout_still_apply(client, clock):
    for _ in range(4):
        assert client.post(LOGIN_URL, json=BAD).status_code == 401
    assert client.post(LOGIN_URL, json=BAD).status_code == 423
    assert client.post(LOGIN_URL, json=GOOD).status_code == 423


def test_ca03_a_success_resets_the_failure_counter(client, clock):
    for _ in range(4):
        client.post(LOGIN_URL, json=BAD)
    assert client.post(LOGIN_URL, json=GOOD).status_code == 204

    assert client.post(LOGIN_URL, json=BAD).status_code == 401


def test_ca04_the_login_screen_and_the_menu_know_the_setting(client):
    assert client.get(OPTIONS_URL).json() == {"mfa_required": False}

    client.post(LOGIN_URL, json=GOOD)
    assert client.get("/api/admin/me").json()["mfa_required"] is False


def test_ca05_switching_the_setting_on_brings_back_the_code(settings):
    from fastapi.testclient import TestClient

    from app.main import create_app

    app = create_app(settings.model_copy(update={"admin_mfa_required": True}))
    try:
        with TestClient(app) as client:
            assert client.get(OPTIONS_URL).json() == {"mfa_required": True}
            response = client.post(LOGIN_URL, json=GOOD)
            assert response.status_code == 202
            assert "mfa" in response.json()
            assert client.get("/api/admin/dashboard").json()["error"]["code"] == "MFA_REQUIRED"
    finally:
        app.state.container.close()
