from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from app.auth.domain.lockout import LOCK_DURATION, MAX_FAILED_ATTEMPTS


class SubjectType(StrEnum):
    EMPLOYEE = "EMPLOYEE"
    ADMIN = "ADMIN"


class Lockable:
    """Blocage après des mots de passe erronés (US-03, US-15), partagé par les comptes employé et admin.

    La classe qui l'utilise porte les attributs `failed_attempts` et `locked_until`.
    """

    failed_attempts: int
    locked_until: datetime | None

    @property
    def remaining_attempts(self) -> int:
        return max(MAX_FAILED_ATTEMPTS - self.failed_attempts, 0)

    def is_locked(self, now: datetime) -> bool:
        return self.locked_until is not None and now < self.locked_until

    def register_failure(self, now: datetime) -> None:
        """Compte un mot de passe erroné ; la 5ᵉ erreur consécutive bloque le compte 15 minutes."""
        if self.locked_until is not None and not self.is_locked(now):
            self.register_success()  # blocage expiré : on repart de zéro
        self.failed_attempts += 1
        if self.failed_attempts >= MAX_FAILED_ATTEMPTS:
            self.locked_until = now + LOCK_DURATION

    def register_success(self) -> None:
        self.failed_attempts = 0
        self.locked_until = None


@dataclass
class Account(Lockable):
    """Compte d'accès d'un employé : mot de passe et état du blocage."""

    employee_id: str
    password_hash: str | None
    failed_attempts: int = 0
    locked_until: datetime | None = None

    @property
    def has_password(self) -> bool:
        return bool(self.password_hash)


@dataclass
class Session:
    """Session ouverte ; seul le hash du jeton est conservé."""

    token_hash: str
    subject_type: SubjectType
    subject_id: str
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
