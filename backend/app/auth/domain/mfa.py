"""US-102 : double authentification des comptes RH (RG-81, RG-82).

Trois méthodes au choix de la personne : code à 6 chiffres par WhatsApp ou par email (usage unique,
valable quelques minutes), ou application d'authentification (TOTP, code renouvelé toutes les 30 secondes).
"""

import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum

from app.auth.domain.errors import InvalidMfaDestination

CODE_LENGTH = 6
CODE_VALIDITY = timedelta(minutes=5)
"""CA-02 : « quelques minutes » ; 5 minutes en attendant la durée fixée (❓ P-14)."""
CHANGE_WINDOW = timedelta(minutes=10)
"""CA-04 : après confirmation avec la méthode actuelle, temps laissé pour enregistrer la nouvelle."""

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE = re.compile(r"^\+\d{8,15}$")


class MfaMethod(StrEnum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    TOTP = "TOTP"

    @property
    def sends_code(self) -> bool:
        return self is not MfaMethod.TOTP


def normalize_destination(method: MfaMethod, value: str | None) -> str | None:
    """Adresse email ou numéro WhatsApp au format international (+509…) ; rien pour une application."""
    if method is MfaMethod.TOTP:
        return None
    raw = (value or "").strip()
    if method is MfaMethod.EMAIL:
        if not _EMAIL.match(raw):
            raise InvalidMfaDestination("Saisissez une adresse email valide.", field="destination")
        return raw.lower()
    phone = re.sub(r"[\s.()-]", "", raw)
    if not _PHONE.match(phone):
        raise InvalidMfaDestination(
            "Saisissez un numéro WhatsApp au format international, par exemple +509 3722 1111.", field="destination"
        )
    return phone


def mask_destination(method: MfaMethod | None, destination: str | None) -> str | None:
    """Destination affichée sans la révéler entièrement : « +509 •••• 1111 », « j•••@exemple.test »."""
    if not destination or method is None or method is MfaMethod.TOTP:
        return None
    if method is MfaMethod.EMAIL:
        name, _, domain = destination.partition("@")
        return f"{name[0]}•••@{domain}"
    return f"{destination[:4]} •••• {destination[-4:]}"


def new_code() -> str:
    return f"{secrets.randbelow(10**CODE_LENGTH):0{CODE_LENGTH}d}"


def hash_code(code: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{code}".encode()).hexdigest()


def is_well_formed(code: str | None) -> bool:
    return bool(code) and len(code) == CODE_LENGTH and code.isdigit()


@dataclass
class PendingCode:
    """Code envoyé par WhatsApp ou email : seul son hash est conservé (CA-02)."""

    code_hash: str
    expires_at: datetime

    def matches(self, code: str, salt: str, now: datetime) -> bool:
        return now < self.expires_at and hmac.compare_digest(self.code_hash, hash_code(code, salt))
