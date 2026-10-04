"""T-02.5 : règles du mot de passe et hachage Argon2."""

import pytest

from app.auth.domain.errors import PasswordMismatch, PasswordTooShort
from app.auth.domain.password import validate_new_password
from app.auth.infrastructure.argon2_hasher import Argon2PasswordHasher


def test_password_of_8_characters_is_accepted():
    validate_new_password("12345678", "12345678")


def test_password_of_7_characters_is_rejected():
    with pytest.raises(PasswordTooShort):
        validate_new_password("1234567", "1234567")


def test_confirmation_must_match():
    with pytest.raises(PasswordMismatch):
        validate_new_password("Bonjour-2026", "bonjour-2026")


def test_argon2_hash_verifies_only_the_right_password():
    hasher = Argon2PasswordHasher()

    password_hash = hasher.hash("Bonjour-2026")

    assert password_hash.startswith("$argon2")
    assert "Bonjour-2026" not in password_hash
    assert hasher.verify(password_hash, "Bonjour-2026")
    assert not hasher.verify(password_hash, "Bonjour-2027")


def test_invalid_stored_hash_never_verifies():
    assert not Argon2PasswordHasher().verify("pas-un-hash", "Bonjour-2026")
