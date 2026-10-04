from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class SubjectType(StrEnum):
    EMPLOYEE = "EMPLOYEE"
    ADMIN = "ADMIN"


ADMIN_SUBJECT_ID = "admin"


@dataclass
class Account:
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
