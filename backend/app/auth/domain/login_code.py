"""US-1003 : code à usage unique de la connexion des employés (doc PAM, « Exigences de sécurité »).

Le code a 6 chiffres, vaut 5 minutes, sert une fois, avec 3 essais. Seule son empreinte HMAC est conservée,
calculée avec une clé secrète, l'employé et le canal ; il est lié à la session d'identification.
Renvoi : 60 secondes entre deux envois, 3 renvois au plus par fenêtre de 15 minutes.
"""

import hashlib
import hmac
import math
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

from app.auth.domain.errors import LoginCodeExpired, LoginResendLimit, LoginResendTooSoon
from app.auth.domain.mfa import CODE_LENGTH, CODE_VALIDITY

MAX_CODE_ATTEMPTS = 3
RESEND_GAP = timedelta(seconds=60)
SEND_WINDOW = timedelta(minutes=15)
MAX_SENDS_PER_WINDOW = 4
"""Le premier envoi et 3 renvois."""


class LoginChannel(StrEnum):
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"  # US-1004


def new_login_code() -> str:
    return f"{secrets.randbelow(10**CODE_LENGTH):0{CODE_LENGTH}d}"


def hash_login_code(key: str, employee_id: str, channel: LoginChannel, code: str) -> str:
    message = f"{employee_id}:{channel.value}:{code}".encode()
    return hmac.new(key.encode(), message, hashlib.sha256).hexdigest()


def _seconds(delta: timedelta) -> int:
    return max(math.ceil(delta.total_seconds()), 1)


@dataclass
class LoginCode:
    """Dernier code envoyé à un employé, avec l'historique des envois qui sert aux limites de renvoi."""

    employee_id: str
    channel: LoginChannel
    code_hash: str = ""
    session_ref: str = ""
    """Empreinte du jeton de la session d'identification qui a demandé le code."""
    expires_at: datetime | None = None
    attempts: int = 0
    sent_at: tuple[datetime, ...] = ()

    @property
    def remaining_attempts(self) -> int:
        return max(MAX_CODE_ATTEMPTS - self.attempts, 0)

    def issue(self, code_hash: str, session_ref: str, now: datetime, channel: LoginChannel | None = None) -> None:
        """Enregistre un nouveau code, qui remplace le précédent ; refuse un envoi trop rapproché."""
        recent = tuple(at for at in self.sent_at if now - at < SEND_WINDOW)
        if recent and now - recent[-1] < RESEND_GAP:
            raise LoginResendTooSoon(_seconds(recent[-1] + RESEND_GAP - now))
        if len(recent) >= MAX_SENDS_PER_WINDOW:
            raise LoginResendLimit(_seconds(recent[0] + SEND_WINDOW - now))
        if channel is not None:
            self.channel = channel
        self.code_hash = code_hash
        self.session_ref = session_ref
        self.expires_at = now + CODE_VALIDITY
        self.attempts = 0
        self.sent_at = (*recent, now)

    def check(self, candidate_hash: str, session_ref: str, now: datetime) -> bool:
        """Vrai si le code est juste (il ne servira plus) ; faux s'il est faux (un essai de moins)."""
        usable = (
            self.code_hash
            and self.session_ref == session_ref
            and self.expires_at is not None
            and now < self.expires_at
            and self.attempts < MAX_CODE_ATTEMPTS
        )
        if not usable:
            raise LoginCodeExpired()
        self.attempts += 1
        if hmac.compare_digest(self.code_hash, candidate_hash):
            self.code_hash = ""
            return True
        return False
