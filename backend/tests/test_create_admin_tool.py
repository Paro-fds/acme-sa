"""US-23 CA-01 — Premier administrateur créé dans la console (T-23.3)."""

import sys

import pytest
from argon2 import PasswordHasher

from app.tools import create_admin
from tests.conftest import TEST_CSV

PASSWORD = "Premier-admin-2026"


@pytest.fixture
def tool_settings(tmp_path, monkeypatch):
    """Le programme lit ses paramètres comme le portail : ici, une base temporaire et aucun compte configuré."""
    monkeypatch.setenv("ACME_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("ACME_CSV_PATH", str(TEST_CSV))
    monkeypatch.setenv("ADMIN_USERNAME", "")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", "")
    return tmp_path / "data"


def _answers(monkeypatch, *, username, passwords):
    monkeypatch.setattr("builtins.input", lambda _prompt: username)
    values = iter(passwords)
    monkeypatch.setattr(create_admin.getpass, "getpass", lambda _prompt: next(values))


def _run(monkeypatch, *args):
    monkeypatch.setattr(sys, "argv", ["create_admin", *args])
    create_admin.main()


def _admins():
    database, admins = create_admin.admin_repository(create_admin.Settings())
    try:
        return admins.list_all()
    finally:
        database.dispose()


def test_ca01_creates_the_first_admin(tool_settings, monkeypatch, capsys):
    _answers(monkeypatch, username="  direction ", passwords=[PASSWORD, PASSWORD])

    _run(monkeypatch, "--if-missing")

    [admin] = _admins()
    assert admin.username == "direction"
    assert admin.must_change_password is False
    assert PasswordHasher().verify(admin.password_hash, PASSWORD)
    output = capsys.readouterr().out
    assert "« direction » créé" in output
    assert PASSWORD not in output


def test_ca01_invalid_input_is_asked_again(tool_settings, monkeypatch, capsys):
    _answers(monkeypatch, username="direction", passwords=["court", "court", PASSWORD, "autre", PASSWORD, PASSWORD])

    _run(monkeypatch)

    output = capsys.readouterr().out
    assert "au moins 12 caractères" in output
    assert "ne correspondent pas" in output
    assert [a.username for a in _admins()] == ["direction"]


def test_ca01_if_missing_asks_nothing_when_an_admin_exists(tool_settings, monkeypatch):
    _answers(monkeypatch, username="direction", passwords=[PASSWORD, PASSWORD])
    _run(monkeypatch)
    monkeypatch.setattr("builtins.input", lambda _prompt: pytest.fail("aucune question attendue"))

    _run(monkeypatch, "--if-missing")

    assert len(_admins()) == 1


def test_ca01_without_flag_refuses_a_second_first_admin(tool_settings, monkeypatch):
    _answers(monkeypatch, username="direction", passwords=[PASSWORD, PASSWORD])
    _run(monkeypatch)

    with pytest.raises(SystemExit, match="existe déjà"):
        _run(monkeypatch)
    assert len(_admins()) == 1


def test_ca03_configured_admin_is_imported_without_asking(tool_settings, monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "admin")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", PasswordHasher().hash(PASSWORD))
    monkeypatch.setattr("builtins.input", lambda _prompt: pytest.fail("aucune question attendue"))

    _run(monkeypatch, "--if-missing")

    assert [a.username for a in _admins()] == ["admin"]
