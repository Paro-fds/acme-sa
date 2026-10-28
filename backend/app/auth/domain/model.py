import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

from app.auth.domain.lockout import LOCK_DURATION, MAX_FAILED_ATTEMPTS, MAX_LOCK_DURATION


class SubjectType(StrEnum):
    EMPLOYEE = "EMPLOYEE"
    ADMIN = "ADMIN"
    EMPLOYEE_LOGIN = "EMPLOYEE_LOGIN"
    """US-1003 : code employé et date de naissance vérifiés, code reçu attendu ; n'ouvre que l'envoi et la saisie du code."""
    ADMIN_MFA = "ADMIN_MFA"
    """US-102 : mot de passe RH vérifié, second facteur attendu ; n'ouvre que les écrans de double authentification."""


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

    def seconds_until_unlock(self, now: datetime) -> int:
        """Secondes restantes avant la fin du blocage, arrondies au-dessus ; 0 si le compte n'est pas bloqué."""
        if not self.is_locked(now):
            return 0
        return math.ceil((self.locked_until - now).total_seconds())

    def register_failure(self, now: datetime) -> None:
        """Compte un échec ; la 5ᵉ erreur consécutive bloque le compte (`lock_duration`)."""
        if self.locked_until is not None and not self.is_locked(now):
            # blocage expiré : on repart de zéro erreur
            self.failed_attempts = 0
            self.locked_until = None
        self.failed_attempts += 1
        if self.failed_attempts >= MAX_FAILED_ATTEMPTS:
            self.locked_until = now + self.lock_duration()

    def lock_duration(self) -> timedelta:
        return LOCK_DURATION

    def register_success(self) -> None:
        self.failed_attempts = 0
        self.locked_until = None


@dataclass
class Account(Lockable):
    """Accès d'un employé : état du verrouillage (US-1003). `password_hash` reste de l'ancienne connexion par
    mot de passe, retirée par US-1003 ; il n'est plus lu ni écrit."""

    employee_id: str
    password_hash: str | None = None
    failed_attempts: int = 0
    locked_until: datetime | None = None
    lockouts: int = 0
    """US-1003 : verrouillages successifs depuis la dernière connexion réussie (verrouillage progressif)."""

    def lock_duration(self) -> timedelta:
        """15 minutes, puis le double à chaque nouveau verrouillage, 24 heures au plus (doc PAM)."""
        return min(LOCK_DURATION * 2**self.lockouts, MAX_LOCK_DURATION)

    def register_failure(self, now: datetime) -> None:
        super().register_failure(now)
        if self.failed_attempts == MAX_FAILED_ATTEMPTS:  # ce verrouillage vient de commencer
            self.lockouts += 1

    def register_success(self) -> None:
        super().register_success()
        self.lockouts = 0


@dataclass
class Session:
    """Session ouverte ; seul le hash du jeton est conservé."""

    token_hash: str
    subject_type: SubjectType
    subject_id: str
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
