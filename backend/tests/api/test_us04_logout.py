"""US-04 — Se déconnecter."""

from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.application.sessions import hash_token
from tests.employees import EMP_A

URL = "/api/auth/logout"
PASSWORD = "Bonjour-2026"


def _login(client) -> str:
    response = client.post("/api/auth/login", json=EMP_A.identity(password=PASSWORD))
    assert response.status_code == 204
    return client.cookies[SESSION_COOKIE]


def test_ca01_logout_deletes_the_session_and_clears_the_cookie(client, account, container):
    account(EMP_A, PASSWORD)
    token = _login(client)
    assert container.sessions.get(hash_token(token)) is not None

    response = client.post(URL)

    assert response.status_code == 204
    assert container.sessions.get(hash_token(token)) is None
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith(f"{SESSION_COOKIE}=")
    assert "Max-Age=0" in set_cookie
    assert SESSION_COOKIE not in client.cookies


def test_ca02_old_cookie_is_rejected_after_logout(app, client, account):
    account(EMP_A, PASSWORD)
    token = _login(client)
    client.post(URL)

    with TestClient(app, cookies={SESSION_COOKIE: token}) as replay:
        response = replay.get("/api/me/profile")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NOT_AUTHENTICATED"


def test_logout_without_session_is_rejected(client):
    assert client.post(URL).status_code == 401


def test_ca04_draft_is_kept_after_logout_and_login(client, account, draft):
    account(EMP_A, PASSWORD)
    draft(EMP_A, {"telephone_number": "+509 3700 0000"})
    _login(client)
    before = client.get("/api/me/update").json()

    client.post(URL)
    _login(client)
    after = client.get("/api/me/update").json()

    assert after == before
    assert after["state"] == "IN_PROGRESS"
    assert [(c["field_name"], c["new_value"]) for c in after["changes"]] == [("telephone_number", "+509 3700 0000")]
