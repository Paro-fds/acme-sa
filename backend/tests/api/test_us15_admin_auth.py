"""US-15 — Se connecter en administrateur (T-15.1 → T-15.3)."""

import re
import tempfile
from pathlib import Path

import pytest

from app.config import Settings
from app.main import create_app
from tests.conftest import TEST_CSV
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A

LOGIN_URL = "/api/admin/auth/login"
LOGOUT_URL = "/api/admin/auth/logout"
GOOD = {"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
BAD_PASSWORD = {"username": ADMIN_USERNAME, "password": "mauvais"}


def _login(client, credentials=GOOD):
    return client.post(LOGIN_URL, json=credentials)


def _fail(client, times):
    for _ in range(times):
        assert _login(client, BAD_PASSWORD).status_code == 401


def _lock(client):
    _fail(client, 4)
    assert _login(client, BAD_PASSWORD).status_code == 423


# --- CA-01, CA-02, CA-06 : connexion, refus, déconnexion (T-15.1) -----------------------


def test_ca01_admin_login_opens_an_admin_session(client):
    response = _login(client)

    assert response.status_code == 204
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=strict" in cookie
    assert client.get("/api/admin/employees").status_code == 200


@pytest.mark.parametrize(
    "credentials",
    [
        BAD_PASSWORD,
        {"username": "inconnu", "password": ADMIN_PASSWORD},
        {"username": ADMIN_USERNAME.upper(), "password": ADMIN_PASSWORD},
        {"username": "", "password": ""},
    ],
    ids=["mauvais-mot-de-passe", "mauvais-identifiant", "casse-identifiant", "vide"],
)
def test_ca02_wrong_credentials_are_rejected_without_detail(client, credentials):
    response = _login(client, credentials)

    assert response.status_code == 401
    error = response.json()["error"]
    assert error == {"code": "INVALID_CREDENTIALS", "message": "Identifiant ou mot de passe incorrect."}
    assert client.get("/api/admin/employees").status_code == 401


def test_ca02_no_admin_password_configured_refuses_every_login(settings):
    from fastapi.testclient import TestClient

    app = create_app(Settings(**{**settings.model_dump(), "admin_password_hash": ""}, _env_file=None))
    try:
        with TestClient(app) as client:
            assert _login(client).status_code == 401
    finally:
        app.state.container.close()


def test_ca02_employee_credentials_do_not_open_the_admin_space(client, account):
    account(EMP_A, "Bonjour-2026")

    assert _login(client, {"username": EMP_A.last_name, "password": "Bonjour-2026"}).status_code == 401


def test_ca06_logout_deletes_the_session(client):
    _login(client)
    token = client.cookies.get("acme_session")

    response = client.post(LOGOUT_URL)

    assert response.status_code == 204
    assert 'acme_session=""' in response.headers["set-cookie"] or "max-age=0" in response.headers["set-cookie"].lower()
    client.cookies.set("acme_session", token)  # rejouer l'ancien jeton ne sert à rien
    assert client.get("/api/admin/employees").status_code == 401


def test_ca06_logout_requires_an_admin_session(client, employee_client):
    assert client.post(LOGOUT_URL).status_code == 401
    assert employee_client(EMP_A).post(LOGOUT_URL).status_code == 403


# --- CA-03 : blocage (T-15.2) ------------------------------------------------------------


def test_ca03_five_consecutive_failures_lock_the_account(client, clock):
    _fail(client, 4)
    response = _login(client, BAD_PASSWORD)

    assert response.status_code == 423
    assert response.json()["error"]["code"] == "ACCOUNT_LOCKED"


def test_ca03_locked_account_refuses_even_the_right_password_for_15_minutes(client, clock):
    _lock(client)

    clock.advance(minutes=14, seconds=59)
    response = _login(client)

    assert response.status_code == 423
    assert "set-cookie" not in response.headers
    assert client.get("/api/admin/employees").status_code == 401


def test_ca03_lock_ends_after_15_minutes(client, clock):
    _lock(client)

    clock.advance(minutes=15)

    assert _login(client).status_code == 204


def test_ca03_wrong_username_locks_no_account(client, clock):
    # Depuis US-23 : blocage par compte ; un identifiant inconnu ne bloque personne.
    for _ in range(5):
        assert _login(client, {"username": "inconnu", "password": "x"}).status_code == 401

    assert _login(client).status_code == 204


def test_ca03_success_resets_the_counter(client, clock):
    _fail(client, 4)
    assert _login(client).status_code == 204

    _fail(client, 4)

    assert _login(client).status_code == 204


def test_ca03_admin_lock_does_not_lock_employees(client, clock, account):
    _lock(client)
    account(EMP_A, "Bonjour-2026")

    response = client.post("/api/auth/login", json=EMP_A.identity(password="Bonjour-2026"))

    assert response.status_code == 204


def test_ca03_lock_survives_a_restart(settings, clock, client):
    from fastapi.testclient import TestClient

    _lock(client)

    restarted = create_app(settings)
    restarted.state.container.clock = clock
    try:
        with TestClient(restarted) as other:
            assert _login(other).status_code == 423
    finally:
        restarted.state.container.close()


# --- CA-07 : expiration après 2 heures d'inactivité (T-15.2) -----------------------------


def test_ca07_session_expires_after_2_hours_of_inactivity(client, clock):
    _login(client)

    clock.advance(hours=2)
    response = client.get("/api/admin/employees")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"
    assert client.get("/api/admin/employees").json()["error"]["code"] == "NOT_AUTHENTICATED"


def test_ca07_activity_keeps_the_session_alive(client, clock):
    _login(client)

    for _ in range(3):
        clock.advance(hours=1, minutes=59)
        assert client.get("/api/admin/employees").status_code == 200


# --- CA-04, CA-05 : toutes les routes /api/admin/* (T-15.3) ------------------------------


def _admin_routes():
    """Liste les routes admin de l'application : toute nouvelle route est testée automatiquement."""
    data_dir = tempfile.TemporaryDirectory()
    root = Path(data_dir.name)
    app = create_app(
        Settings(_env_file=None, acme_csv_path=TEST_CSV, acme_data_dir=root / "data", frontend_dist_dir=root / "dist")
    )
    try:
        routes = [
            (method.upper(), path)
            for path, operations in app.openapi()["paths"].items()
            if path.startswith("/api/admin/") and path != LOGIN_URL
            for method in sorted(operations)
        ]
    finally:
        app.state.container.close()
        data_dir.cleanup()
    assert routes, "aucune route admin trouvée"
    return routes


ADMIN_ROUTES = _admin_routes()


def _concrete(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "1001", path)


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES, ids=[f"{m} {p}" for m, p in ADMIN_ROUTES])
def test_ca05_every_admin_route_requires_a_session(client, method, path):
    response = client.request(method, _concrete(path))

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES, ids=[f"{m} {p}" for m, p in ADMIN_ROUTES])
def test_ca04_every_admin_route_refuses_an_employee_session(employee_client, method, path):
    response = employee_client(EMP_A).request(method, _concrete(path))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ADMIN_ONLY"


def test_ca04_admin_session_cannot_reach_employee_routes(admin_client):
    assert admin_client.get("/api/me/profile").status_code == 401
    assert admin_client.get("/api/me/update").status_code == 401
