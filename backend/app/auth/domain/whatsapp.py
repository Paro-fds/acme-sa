"""US-1004 : code de connexion par WhatsApp (doc PAM, « Quota WhatsApp »).

5 messages par employé et par mois civil (heure UTC), renvois compris, comptés côté serveur.
Le numéro est celui de Vault, lu au format international ; aucun autre numéro n'est accepté.
"""

import re
from dataclasses import dataclass
from datetime import datetime

from app.auth.domain.errors import WhatsAppQuotaReached

MONTHLY_QUOTA = 5
HAITI_PREFIX = "509"
_INTERNATIONAL = re.compile(r"^\+\d{8,15}$")


def whatsapp_number(raw: str | None) -> str | None:
    """« +509 3722-7777 », « 37228888 », « 509 3722 8888 » → +50937228888 ; None si le numéro est illisible."""
    value = (raw or "").strip()
    digits = re.sub(r"\D", "", value)
    if not value.startswith("+"):
        if len(digits) == 8:  # numéro haïtien sans indicatif
            digits = HAITI_PREFIX + digits
        elif not (digits.startswith(HAITI_PREFIX) and len(digits) == 11):
            return None
    number = f"+{digits}"
    return number if _INTERNATIONAL.match(number) else None


def month_of(moment: datetime) -> str:
    return f"{moment:%Y-%m}"


@dataclass
class WhatsAppQuota:
    employee_id: str
    month: str
    used: int = 0

    @property
    def remaining(self) -> int:
        return max(MONTHLY_QUOTA - self.used, 0)

    def check(self) -> None:
        if self.used >= MONTHLY_QUOTA:
            raise WhatsAppQuotaReached()

    def consume(self) -> None:
        self.check()
        self.used += 1
