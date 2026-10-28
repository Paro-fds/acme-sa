"""US-1015 : captcha et verrous de l'identification (modèle d'authentification du directeur).

Chaque échec compte deux fois : pour le code employé tapé et pour l'adresse IP. L'un ou l'autre suffit à bloquer.

| Échecs | Effet |
| 3      | un calcul « Combien font a + b ? » est exigé |
| 5 à 9  | verrou d'une minute |
| 10 à 14| verrou de 15 minutes |
| 15 et +| verrou d'une heure |

Pendant le verrou, la réponse reste « Informations incorrectes. » et le compteur n'augmente plus.
Un succès remet les deux compteurs à zéro.
"""

import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

CAPTCHA_AFTER = 3
LOCK_AFTER = 5
UNKNOWN_CODE = "INCONNU"
_CODE = re.compile(r"^[A-Z0-9-]{4,16}$")
"""Le modèle n'admet que lettres et chiffres ; le tiret est gardé pour les codes « AC-1001 »."""


def typed_code(raw: str) -> str:
    """Code compacté, en majuscules ; un code illisible devient `INCONNU`, pour que les essais absurdes
    partagent un seul compteur."""
    code = "".join((raw or "").split()).upper()
    return code if _CODE.fullmatch(code) else UNKNOWN_CODE


def code_key(code: str) -> str:
    return f"code#{code}"


def ip_key(ip: str) -> str:
    return f"ip#{ip}"


def lock_duration(failures: int) -> timedelta | None:
    if failures < LOCK_AFTER:
        return None
    if failures < 10:
        return timedelta(minutes=1)
    if failures < 15:
        return timedelta(minutes=15)
    return timedelta(hours=1)


@dataclass
class LoginLock:
    key: str
    failures: int = 0
    locked_until: datetime | None = None

    def is_locked(self, now: datetime) -> bool:
        return self.locked_until is not None and now < self.locked_until

    def register_failure(self, now: datetime) -> None:
        self.failures += 1
        duration = lock_duration(self.failures)
        if duration is not None:
            self.locked_until = now + duration

    def reset(self) -> None:
        self.failures = 0
        self.locked_until = None


@dataclass
class Captcha:
    """Question et réponse restent sur le serveur (clé `IP|code`) ; le navigateur ne reçoit que la question."""

    key: str
    question: str
    answer: str

    @classmethod
    def draw(cls, key: str) -> "Captcha":
        left, right = secrets.randbelow(8) + 2, secrets.randbelow(8) + 2
        return cls(key, f"Combien font {left} + {right} ?", str(left + right))

    def accepts(self, answer: str | None) -> bool:
        return hmac.compare_digest((answer or "").strip(), self.answer)
