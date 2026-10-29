"""US-205 : péremption des informations du dossier (EF-210 ; RG-60 → RG-64 ; D-36).

- Une information non confirmée depuis 12 mois est périmée (RG-60) ; le rappel est dû 30 jours avant (RG-61).
- Les certificats validés et le niveau d'études ne se périment jamais (RG-63).
- La date de départ est la dernière saisie, modification ou confirmation (RG-64 : rien avant le lancement).
- Choix de l'utilisateur du 2026-10-11 : une information périmée est signalée sans rien bloquer ; l'effet à la fin
  du délai de grâce (RG-62) reste à décider par la DRH.
"""

from datetime import date, datetime, timedelta
from enum import StrEnum

from app.dossier.domain.dossier import Information
from app.dossier.domain.hr_information import HrItem

PERISHABLE: tuple[str, ...] = (
    Information.TELEPHONE.value,
    Information.ADDRESS.value,
    Information.EMAIL.value,
    Information.EMERGENCY_CONTACT.value,
    HrItem.AGENCY.value,
    HrItem.POSITION.value,
    HrItem.HIRE_DATE.value,
)
"""Les informations qui se périment, dans l'ordre de l'écran ; jamais le niveau d'études (RG-63)."""

REMINDER_DAYS = 30
"""RG-61 🟡 : rappel 30 jours avant la péremption (D-36)."""


class Freshness(StrEnum):
    FRESH = "FRESH"
    DUE_SOON = "DUE_SOON"
    """Dans les 30 jours avant la péremption : le rappel est dû."""
    STALE = "STALE"


def expiry(confirmed_at: datetime) -> date:
    """Un an jour pour jour après la dernière confirmation ; un 29 février se périme le 28 février."""
    day = confirmed_at.date()
    try:
        return day.replace(year=day.year + 1)
    except ValueError:
        return day.replace(year=day.year + 1, day=28)


def reminder(confirmed_at: datetime) -> date:
    return expiry(confirmed_at) - timedelta(days=REMINDER_DAYS)


def freshness(confirmed_at: datetime, today: date) -> Freshness:
    if today >= expiry(confirmed_at):
        return Freshness.STALE
    if today >= reminder(confirmed_at):
        return Freshness.DUE_SOON
    return Freshness.FRESH
