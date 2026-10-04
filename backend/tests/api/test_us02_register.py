"""US-02 — Créer son mot de passe."""

import pytest

from tests.employees import EMP_A, EMP_D1, EMP_I

URL = "/api/auth/register"


def _register(client, employee=EMP_A, password="Bonjour-2026", confirmation=None, **identity):
    return client.post(
        URL,
        json=employee.identity(
            password=password,
            password_confirmation=password if confirmation is None else confirmation,
            **identity,
        ),
    )


def test_ca01_creation_opens_a_session(client):
    response = _register(client)

    assert response.status_code == 204
    cookie = response.headers["set-cookie"]
    assert "acme_session=" in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=strict" in cookie
    assert client.get("/api/me/profile").status_code == 200


def test_ca02_password_shorter_than_8_characters_is_rejected(client, container):
    response = _register(client, password="Court12")

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "PASSWORD_TOO_SHORT",
        "message": "Le mot de passe doit contenir au moins 8 caractères.",
        "field": "password",
    }
    assert container.accounts.get(EMP_A.id) is None


def test_ca03_confirmation_must_match(client, container):
    response = _register(client, password="Bonjour-2026", confirmation="Bonjour-2027")

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "PASSWORD_MISMATCH",
        "message": "Les deux mots de passe ne correspondent pas.",
        "field": "password_confirmation",
    }
    assert container.accounts.get(EMP_A.id) is None


def test_ca04_existing_password_cannot_be_replaced(client, account, container):
    account(EMP_A, "Ancien-2026")

    response = _register(client, password="Nouveau-2026")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ACCOUNT_ALREADY_EXISTS"
    stored = container.accounts.get(EMP_A.id).password_hash
    assert container.password_hasher.verify(stored, "Ancien-2026")
    assert "set-cookie" not in response.headers


@pytest.mark.parametrize(
    ("employee", "overrides", "status"),
    [
        (EMP_A, {"last_name": "INCONNU"}, 401),
        (EMP_I, {}, 401),
        (EMP_D1, {}, 409),
    ],
    ids=["inconnu", "inactif", "doublon"],
)
def test_ca05_unrecognized_identity_creates_no_account(client, container, employee, overrides, status):
    response = _register(client, employee=employee, **overrides)

    assert response.status_code == status
    assert container.accounts.get(employee.id) is None
    assert "set-cookie" not in response.headers


def test_ca06_password_is_stored_as_argon2_hash(client, container):
    _register(client, password="Bonjour-2026")

    stored = container.accounts.get(EMP_A.id).password_hash
    assert stored != "Bonjour-2026"
    assert stored.startswith("$argon2")
