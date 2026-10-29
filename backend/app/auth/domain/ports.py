from datetime import datetime
from typing import Protocol

from app.auth.domain.admin import AdminAccount, RoleChange
from app.auth.domain.contacts import SeenContact
from app.auth.domain.login_lock import Captcha, LoginLock
from app.auth.domain.login_code import LoginChannel, LoginCode
from app.auth.domain.whatsapp import WhatsAppQuota
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


class LoginCodeRepository(Protocol):
    """US-1003 : dernier code de connexion de chaque employé (empreinte seulement) et ses envois."""

    def get(self, employee_id: str) -> LoginCode | None: ...

    def save(self, login_code: LoginCode) -> None: ...


class MessageNotSent(Exception):
    """Le message n'a pas pu partir (envoi non configuré, refus du service)."""


class EmailNotSent(MessageNotSent):
    """Le courriel n'a pas pu partir."""


class EmailSender(Protocol):
    """US-1003 : courriels de la connexion (code, connexion réussie, verrouillage)."""

    def send(self, to: str, subject: str, body: str, html: str | None = None) -> None:
        """Envoie un courriel en texte brut, avec sa version HTML s'il y en a une ;
        lève `EmailNotSent` s'il ne peut pas partir."""
        ...


class WhatsAppSender(Protocol):
    """US-1004 : code de connexion par WhatsApp (modèle « Authentification » de Meta)."""

    configured: bool
    """US-1018 : faux tant que le modèle Meta et le jeton manquent ; WhatsApp est alors affiché « Indisponible »."""

    def send_code(self, to: str, code: str) -> None:
        """Lève `MessageNotSent` si le message ne peut pas partir."""
        ...


class WhatsAppQuotaRepository(Protocol):
    def get(self, employee_id: str, month: str) -> WhatsAppQuota | None: ...

    def save(self, quota: WhatsAppQuota) -> None: ...


class SeenContactRepository(Protocol):
    """US-1005 : dernier contact vu dans Vault, par employé et par canal."""

    def get(self, employee_id: str, channel: LoginChannel) -> SeenContact | None: ...

    def save(self, contact: SeenContact) -> None: ...


class LoginLockRepository(Protocol):
    """US-1015 : compteurs d'échecs, par code employé tapé et par adresse IP."""

    def get(self, key: str) -> LoginLock | None: ...

    def save(self, lock: LoginLock) -> None: ...


class CaptchaRepository(Protocol):
    def get(self, key: str) -> Captcha | None: ...

    def save(self, captcha: Captcha) -> None: ...
