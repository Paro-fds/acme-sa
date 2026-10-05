"""US-23 — Comptes administrateurs : règles du domaine et migration (T-23.1)."""

from datetime import UTC, datetime, timedelta

import pytest

from app.auth.application.admin_accounts import ImportConfiguredAdmin
from app.auth.domain.admin import AdminAccount, validate_admin_password, validate_username
from app.auth.domain.errors import AdminPasswordTooShort, InvalidUsername
from tests.fake_clock import FakeClock

NOW = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)


class InMemoryAdmins:
    def __init__(self, *accounts: AdminAccount) -> None:
        self.accounts = {account.id: account for account in accounts}

    def list_all(self):
        return sorted(self.accounts.values(), key=lambda account: account.created_at)

    def get(self, admin_id):
        return self.accounts.get(admin_id)

    def find_by_username(self, username):
        return next((a for a in self.accounts.values() if a.username == username), None)

    def username_taken(self, username):
        return any(a.username.casefold() == username.casefold() for a in self.accounts.values())

    def add(self, account):
        self.accounts[account.id] = account

    def save(self, account):
        self.accounts[account.id] = account

    def delete(self, admin_id):
        self.accounts.pop(admin_id, None)

    def count(self):
        return len(self.accounts)


def _admin(admin_id="a1", username="admin"):
    return AdminAccount(id=admin_id, username=username, password_hash="$argon2id$h", created_at=NOW)


# --- Identifiant et mot de passe -------------------------------------------------------


@pytest.mark.parametrize("username", ["abc", "marie.pierre", "j-b_2026", "A" * 50, "  admin2  "])
def test_valid_usernames(username):
    assert validate_username(username) == username.strip()


@pytest.mark.parametrize("username", ["", "ab", "A" * 51, "marie pierre", "élodie", "admin@acme", "a/b"])
def test_invalid_usernames(username):
    with pytest.raises(InvalidUsername) as error:
        validate_username(username)
    assert error.value.field == "username"


def test_admin_password_needs_12_characters():
    validate_admin_password("x" * 12, field="password")
    with pytest.raises(AdminPasswordTooShort) as error:
        validate_admin_password("x" * 11, field="new_password")
    assert error.value.field == "new_password"
    assert "12 caractères" in error.value.message


# --- CA-11 : blocage par compte --------------------------------------------------------


def test_ca11_lockout_is_per_account():
    marie, other = _admin("a1", "marie.pierre"), _admin("a2", "admin")
    for _ in range(5):
        marie.register_failure(NOW)

    assert marie.is_locked(NOW)
    assert not marie.is_locked(NOW + timedelta(minutes=15))
    assert not other.is_locked(NOW)


# --- CA-03 : migration depuis la configuration -----------------------------------------


def test_ca03_configured_admin_is_imported_when_the_table_is_empty():
    admins = InMemoryAdmins()

    ImportConfiguredAdmin(admins, FakeClock(), "admin", "$argon2id$hash", new_id=lambda: "id-1").execute()

    imported = admins.get("id-1")
    assert (imported.username, imported.password_hash, imported.must_change_password) == ("admin", "$argon2id$hash", False)
    assert imported.created_by is None


def test_ca03_nothing_is_imported_when_an_admin_exists():
    admins = InMemoryAdmins(_admin("a1", "deja-la"))

    ImportConfiguredAdmin(admins, FakeClock(), "admin", "$argon2id$hash").execute()

    assert [a.username for a in admins.list_all()] == ["deja-la"]


@pytest.mark.parametrize(("username", "password_hash"), [("admin", ""), ("", "$argon2id$hash")])
def test_ca03_nothing_is_imported_without_a_complete_configuration(username, password_hash):
    admins = InMemoryAdmins()

    ImportConfiguredAdmin(admins, FakeClock(), username, password_hash).execute()

    assert admins.count() == 0
