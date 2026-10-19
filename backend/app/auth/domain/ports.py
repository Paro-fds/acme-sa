from datetime import datetime
from typing import Protocol

from app.auth.domain.admin import AdminAccount, RoleChange
from app.auth.domain.mfa import MfaMethod
from app.auth.domain.model import Account, Session, SubjectType


class AccountRepository(Protocol):
    def get(self, employee_id: str) -> Account | None: ...

    def save(self, account: Account) -> None: ...


class SessionRepository(Protocol):
    def get(self, token_hash: str) -> Session | None: ...

    def save(self, session: Session) -> None: ...

    def delete(self, token_hash: str) -> None: ...

    def delete_for_subject(self, subject_type: SubjectType, subject_id: str) -> None: ...


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

    def verify(self, password_hash: str, password: str) -> bool: ...


class AdminAccountRepository(Protocol):
    def list_all(self) -> list[AdminAccount]:
        """Comptes administrateurs, du plus ancien au plus récent."""
        ...

    def get(self, admin_id: str) -> AdminAccount | None: ...

    def find_by_username(self, username: str) -> AdminAccount | None:
        """Recherche exacte (majuscules comprises), comme à la connexion."""
        ...

    def username_taken(self, username: str) -> bool:
        """Identifiant déjà utilisé, sans tenir compte des majuscules."""
        ...

    def add(self, account: AdminAccount) -> None: ...

    def save(self, account: AdminAccount) -> None: ...

    def delete(self, admin_id: str) -> None: ...

    def count(self) -> int: ...

    def record_role_change(self, change: RoleChange) -> None: ...

    def list_role_changes(self, admin_id: str | None = None) -> list[RoleChange]: ...


class TotpService(Protocol):
    """US-102 CA-03 : application d'authentification (TOTP, Microsoft Authenticator ou autre)."""

    def new_secret(self) -> str: ...

    def provisioning_uri(self, secret: str, account_name: str) -> str:
        """Adresse `otpauth://` que l'application lit dans le QR code."""
        ...

    def qr_code(self, uri: str) -> str:
        """QR code de cette adresse, en image SVG (`data:` URI) affichable telle quelle."""
        ...

    def verify(self, secret: str, code: str, now: datetime) -> bool: ...


class CodeSender(Protocol):
    """US-102 CA-02 : envoi d'un code à usage unique par WhatsApp ou par email."""

    def send(self, method: MfaMethod, destination: str, code: str) -> None: ...


class SecurityLog(Protocol):
    """US-102 CA-07 : trace des connexions RH et des changements de double authentification."""

    def record(self, event: str, admin_id: str | None, **details: str) -> None: ...
