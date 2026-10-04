"""US-02 — Créer son mot de passe (Walking Skeleton : CA-01, CA-06)."""

from tests.employees import EMP_A

URL = "/api/auth/register"


def _register(client, password="Bonjour-2026", confirmation=None):
    return client.post(
        URL,
        json=EMP_A.identity(password=password, password_confirmation=confirmation or password),
    )


def test_ca01_creation_opens_a_session(client):
    response = _register(client)

    assert response.status_code == 204
    cookie = response.headers["set-cookie"]
    assert "acme_session=" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=strict" in cookie
    assert client.get("/api/me/profile").status_code == 200


def test_ca06_password_is_stored_as_argon2_hash(client, container):
    _register(client, password="Bonjour-2026")

    stored = container.accounts.get(EMP_A.id).password_hash
    assert stored != "Bonjour-2026"
    assert stored.startswith("$argon2")
