"""US-1014 : la date de naissance tapée à l'écran (modèle d'authentification du directeur).

Huit chiffres, jour mois année : « 27101990 » est le 27 octobre 1990. Les séparateurs sont ignorés, mais il faut
huit chiffres. Une date incomplète ou impossible (32 octobre) ne se lit pas : elle échoue comme une date fausse.
"""

import hmac
import re
from datetime import date


def typed_birth_date(raw: str) -> date | None:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) != 8:
        return None
    try:
        return date(int(digits[4:]), int(digits[2:4]), int(digits[:2]))
    except ValueError:
        return None


def same_birth_date(known: date | None, typed: date | None) -> bool:
    """Comparaison en temps constant : le temps de réponse ne dit rien de la date. Une date absente échoue."""
    if known is None or typed is None:
        return False
    return hmac.compare_digest(known.isoformat(), typed.isoformat())
