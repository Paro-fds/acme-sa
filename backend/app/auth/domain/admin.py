"""Comptes administrateurs enregistrés dans la base (US-23, F-30)."""

import re
from dataclasses import dataclass
from datetime import datetime

from app.auth.domain.errors import AdminPasswordTooShort, InvalidUsername
from app.auth.domain.mfa import MfaMethod, PendingCode
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
    # --- US-102 : double authentification ---
    mfa_method: MfaMethod | None = None
    """Méthode enregistrée ; None tant que la personne n'en a pas choisi (première connexion, réinitialisation)."""
    mfa_secret: str | None = None
    """Secret TOTP partagé avec l'application d'authentification."""
    mfa_destination: str | None = None
    """Adresse email ou numéro WhatsApp qui reçoit les codes."""
    mfa_pending_method: MfaMethod | None = None
    mfa_pending_secret: str | None = None
    mfa_pending_destination: str | None = None
    """Méthode en cours d'enregistrement : elle ne remplace l'actuelle qu'une fois un code confirmé."""
    mfa_code: PendingCode | None = None
    mfa_change_allowed_until: datetime | None = None
    """CA-04 : fin du délai accordé pour changer de méthode, après confirmation avec l'actuelle."""

    @property
    def mfa_enrolled(self) -> bool:
        return self.mfa_method is not None

    def reset_mfa(self) -> None:
        """CA-05 : téléphone perdu ; une nouvelle méthode sera choisie à la connexion suivante."""
        self.mfa_method = self.mfa_secret = self.mfa_destination = None
        self.clear_pending_mfa()
        self.mfa_change_allowed_until = None

    def clear_pending_mfa(self) -> None:
        self.mfa_pending_method = self.mfa_pending_secret = self.mfa_pending_destination = None
        self.mfa_code = None


def validate_username(username: str | None) -> str:
    value = (username or "").strip()
    if not _USERNAME.match(value):
        raise InvalidUsername(field="username")
    return value


def validate_admin_password(password: str | None, *, field: str) -> None:
    if len(password or "") < ADMIN_PASSWORD_MIN_LENGTH:
        raise AdminPasswordTooShort(field=field)
