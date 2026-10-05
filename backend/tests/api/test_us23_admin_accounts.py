"""US-23 — Gérer les comptes administrateurs (T-23.2)."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A

ADMINS = "/api/admin/admins"
ME = "/api/admin/me"
MY_PASSWORD = "/api/admin/me/password"
LOGIN = "/api/admin/auth/login"
PROVISIONAL = "Provisoire-2026!"
CHOSEN = "Mon-propre-mot-2026"


def _login(client, username, password):
    return client.post(LOGIN, json={"username": username, "password": password})


def _add(admin_client, username="marie.pierre", password=PROVISIONAL):
    return admin_client.post(ADMINS, json={"username": username, "password": password})


def _change(client, current, new, confirmation=None):
    return client.post(
        MY_PASSWORD,
        json={"current_password": current, "new_password": new, "new_password_confirmation": confirmation or new},
    )


# --- CA-02 : aucune création sans session admin ---------------------------------------


def test_ca02_no_account_can_be_created_without_an_admin_session(client, employee_client, container):
    before = container.admin_accounts.count()

    assert _add(client).status_code == 401
    assert _add(employee_client(EMP_A)).status_code == 403
    assert container.admin_accounts.count() == before


def test_ca02_without_any_admin_nobody_can_create_one_through_the_api(settings):
    empty = create_app(settings.model_copy(update={"admin_username": "", "admin_password_hash": ""}))
    try:
        with TestClient(empty) as client:
            assert _add(client).status_code == 401
            assert empty.state.container.admin_accounts.count() == 0
    finally:
        empty.state.container.close()


# --- CA-03 : migration depuis la configuration -----------------------------------------


def test_ca03_configured_admin_can_log_in(client, container):
    assert [a.username for a in container.admin_accounts.list_all()] == [ADMIN_USERNAME]
    assert _login(client, ADMIN_USERNAME, ADMIN_PASSWORD).status_code == 204


def test_ca03_import_happens_once(settings, container):
    restarted = create_app(settings)
    try:
        assert restarted.state.container.admin_accounts.count() == 1
    finally:
        restarted.state.container.close()


# --- CA-04 : liste ---------------------------------------------------------------------


def test_ca04_list_shows_every_admin_and_marks_me(admin_client, container, clock):
    # Le compte importé l'a été avec l'horloge réelle : l'ajout se fait après lui.
    imported = container.admin_accounts.find_by_username(ADMIN_USERNAME).created_at
    clock.now = lambda: imported + timedelta(minutes=1)
    _add(admin_client)

    listed = admin_client.get(ADMINS).json()

    assert [(a["username"], a["is_me"], a["must_change_password"]) for a in listed] == [
        (ADMIN_USERNAME, True, False),
        ("marie.pierre", False, True),
    ]
    assert listed[1]["created_at"] > listed[0]["created_at"]
    assert listed[1]["last_login_at"] is None
    assert listed[1]["created_by"] == ADMIN_USERNAME


def test_ca04_last_login_is_recorded(client, clock, admin_client):
    _login(client, ADMIN_USERNAME, ADMIN_PASSWORD)

    me = next(a for a in admin_client.get(ADMINS).json() if a["username"] == ADMIN_USERNAME)

    assert me["last_login_at"].startswith("2026-10-04T09:00:00")


def test_ca04_me(admin_client):
    assert admin_client.get(ME).json() == {
        "id": admin_client.get(ME).json()["id"],
        "username": ADMIN_USERNAME,
        "must_change_password": False,
    }


# --- CA-05 : ajout ---------------------------------------------------------------------


def test_ca05_added_admin_can_log_in(admin_client, client):
    response = _add(admin_client)

    assert response.status_code == 201
    assert response.json()["username"] == "marie.pierre"
    assert _login(client, "marie.pierre", PROVISIONAL).status_code == 204


def test_ca05_username_is_trimmed(admin_client):
    assert _add(admin_client, username="  marie.pierre ").json()["username"] == "marie.pierre"


# --- CA-06 : identifiant pris ou invalide ----------------------------------------------


@pytest.mark.parametrize("username", [ADMIN_USERNAME, ADMIN_USERNAME.upper(), "Marie.Pierre"])
def test_ca06_username_already_taken(admin_client, username):
    _add(admin_client)
    count = len(admin_client.get(ADMINS).json())

    response = _add(admin_client, username=username)

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "USERNAME_TAKEN"
    assert response.json()["error"]["field"] == "username"
    assert len(admin_client.get(ADMINS).json()) == count


@pytest.mark.parametrize(
    ("username", "password", "code", "field"),
    [
        ("ab", PROVISIONAL, "INVALID_USERNAME", "username"),
        ("marie pierre", PROVISIONAL, "INVALID_USERNAME", "username"),
        ("marie.pierre", "trop-court", "PASSWORD_TOO_SHORT", "password"),
    ],
)
def test_ca06_invalid_input(admin_client, username, password, code, field):
    response = _add(admin_client, username=username, password=password)

    assert response.status_code == 422
    assert (response.json()["error"]["code"], response.json()["error"]["field"]) == (code, field)
    assert len(admin_client.get(ADMINS).json()) == 1


# --- CA-07 : mot de passe provisoire ---------------------------------------------------


def test_ca07_provisional_password_must_be_changed_first(admin_client, client):
    _add(admin_client)
    _login(client, "marie.pierre", PROVISIONAL)

    assert client.get(ME).json()["must_change_password"] is True
    response = client.get("/api/admin/statistics")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PASSWORD_CHANGE_REQUIRED"
    assert client.get(ADMINS).status_code == 403

    assert _change(client, PROVISIONAL, CHOSEN).status_code == 204

    assert client.get(ME).json()["must_change_password"] is False
    assert client.get("/api/admin/statistics").status_code == 200


def test_ca07_logout_is_allowed_before_the_change(admin_client, client):
    _add(admin_client)
    _login(client, "marie.pierre", PROVISIONAL)

    assert client.post("/api/admin/auth/logout").status_code == 204


def test_ca07_new_password_must_differ_from_the_provisional_one(admin_client, client):
    _add(admin_client)
    _login(client, "marie.pierre", PROVISIONAL)

    response = _change(client, PROVISIONAL, PROVISIONAL)

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "PASSWORD_UNCHANGED",
        "message": "Choisissez un mot de passe différent de l'actuel.",
        "field": "new_password",
    }


# --- CA-08 : changer son mot de passe --------------------------------------------------


def test_ca08_change_password(admin_client, client):
    assert _change(admin_client, ADMIN_PASSWORD, CHOSEN).status_code == 204

    assert _login(client, ADMIN_USERNAME, ADMIN_PASSWORD).status_code == 401
    assert _login(client, ADMIN_USERNAME, CHOSEN).status_code == 204
    # La session qui a fait le changement reste ouverte (nouveau jeton).
    assert admin_client.get("/api/admin/statistics").status_code == 200


def test_ca08_other_sessions_are_closed(admin_client, app):
    with TestClient(app) as other:
        _login(other, ADMIN_USERNAME, ADMIN_PASSWORD)
        assert other.get(ME).status_code == 200

        _change(admin_client, ADMIN_PASSWORD, CHOSEN)

        assert other.get(ME).status_code == 401


@pytest.mark.parametrize(
    ("current", "new", "confirmation", "code", "field"),
    [
        ("mauvais", CHOSEN, CHOSEN, "WRONG_PASSWORD", "current_password"),
        (ADMIN_PASSWORD, "court", "court", "PASSWORD_TOO_SHORT", "new_password"),
        (ADMIN_PASSWORD, CHOSEN, "autre-chose-2026", "PASSWORD_MISMATCH", "new_password_confirmation"),
    ],
)
def test_ca08_refused_change_changes_nothing(admin_client, client, current, new, confirmation, code, field):
    response = _change(admin_client, current, new, confirmation)

    assert response.status_code == 422
    assert (response.json()["error"]["code"], response.json()["error"]["field"]) == (code, field)
    assert _login(client, ADMIN_USERNAME, ADMIN_PASSWORD).status_code == 204


# --- CA-09, CA-10 : suppression et garde-fous ------------------------------------------


def test_ca09_delete_removes_the_account_and_its_sessions(admin_client, app):
    marie = _add(admin_client).json()
    with TestClient(app) as other:
        _login(other, "marie.pierre", PROVISIONAL)
        assert other.get(ME).status_code == 200

        assert admin_client.delete(f"{ADMINS}/{marie['id']}").status_code == 204

        assert other.get(ME).status_code == 401
        assert _login(other, "marie.pierre", PROVISIONAL).status_code == 401
    assert [a["username"] for a in admin_client.get(ADMINS).json()] == [ADMIN_USERNAME]


def test_ca10_cannot_delete_oneself(admin_client):
    me = admin_client.get(ME).json()

    response = admin_client.delete(f"{ADMINS}/{me['id']}")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CANNOT_DELETE_SELF"
    assert len(admin_client.get(ADMINS).json()) == 1


def test_ca10_unknown_admin_gives_404(admin_client):
    response = admin_client.delete(f"{ADMINS}/inconnu")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ADMIN_NOT_FOUND"


# --- CA-11 : blocage par compte --------------------------------------------------------


def test_ca11_lock_is_per_account(admin_client, client, clock):
    _add(admin_client)
    for _ in range(4):
        assert _login(client, "marie.pierre", "mauvais").status_code == 401
    assert _login(client, "marie.pierre", "mauvais").status_code == 423

    assert _login(client, "marie.pierre", PROVISIONAL).status_code == 423
    assert _login(client, ADMIN_USERNAME, ADMIN_PASSWORD).status_code == 204


def test_ca11_unknown_username_locks_nobody(client, clock):
    for _ in range(6):
        response = _login(client, "inconnu", "x")
        assert response.status_code == 401
        assert response.json()["error"]["message"] == "Identifiant ou mot de passe incorrect."

    assert _login(client, ADMIN_USERNAME, ADMIN_PASSWORD).status_code == 204


# --- CA-12 : aucune donnée sensible ----------------------------------------------------


def test_ca12_no_password_or_hash_in_responses(admin_client):
    responses = [_add(admin_client), admin_client.get(ADMINS), admin_client.get(ME)]

    for response in responses:
        assert "argon2" not in response.text.lower()
        assert PROVISIONAL not in response.text
        assert "password_hash" not in response.text
