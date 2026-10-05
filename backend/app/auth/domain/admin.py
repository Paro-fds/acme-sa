"""Comptes administrateurs enregistrés dans la base (US-23, F-30)."""

import re
from dataclasses import dataclass
from datetime import datetime

from app.auth.domain.errors import AdminPasswordTooShort, InvalidUsername
from app.auth.domain.model import Lockable

ADMIN_PASSWORD_MIN_LENGTH = 12
_USERNAME = re.compile(r"^[A-Za-z0-9._-]{3,50}$")


@dataclass
class AdminAccount(Lockable):
    id: str
    username: str
    password_hash: str
    created_at: datetime
    created_by: str | None = None
    """Administrateur qui a créé le compte ; None pour le premier compte et la migration."""
    must_change_password: bool = False
    """Mot de passe provisoire, choisi par un autre administrateur : à changer à la première connexion."""
    failed_attempts: int = 0
    locked_until: datetime | None = None
    last_login_at: datetime | None = None


def validate_username(username: str | None) -> str:
    value = (username or "").strip()
    if not _USERNAME.match(value):
        raise InvalidUsername(field="username")
    return value


def validate_admin_password(password: str | None, *, field: str) -> None:
    if len(password or "") < ADMIN_PASSWORD_MIN_LENGTH:
        raise AdminPasswordTooShort(field=field)
