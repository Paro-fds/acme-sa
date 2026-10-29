"""US-1012 : ma balance PER, lue dans l'objet `pam/balances/per/{CODE}.json` déposé par l'export Shivam.

Règles reprises du module du directeur (`pam/pam/plateforme/noyau.py`) : la clé vient du code de la session,
jamais du navigateur ; montants au format « 1.234,56 », dates JJ/MM/AAAA, mois en toutes lettres ; la photo la
plus récente est la balance, toutes les photos forment le relevé.
"""

import re
from dataclasses import dataclass

from app.shared.domain.errors import DomainError, NotFound

PREFIX = "pam/balances"
_CODE = re.compile(r"^[A-Z0-9-]{4,16}$")
MONTHS = ("", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
          "novembre", "décembre")


class NoBalance(NotFound):
    code = "NO_BALANCE"
    message = "Aucune balance n'est disponible pour le moment."


class PerUnavailable(DomainError):
    code = "PER_UNAVAILABLE"
    message = "Service momentanément indisponible."
    http_status = 503


def per_key(employee_code: str, prefix: str = PREFIX) -> str:
    code = "".join((employee_code or "").split()).upper()
    if not _CODE.fullmatch(code):
        raise NoBalance()
    return f"{prefix.strip('/')}/per/{code}.json"


def amount_fr(value) -> str:
    """« 1234.5 » → « 1.234,50 » (montant_fr du directeur) ; une valeur illisible est rendue telle quelle."""
    raw = str(value if value is not None else "0").strip() or "0"
    negative = raw.startswith("-")
    raw = raw.lstrip("-")
    if "," in raw and "." not in raw:
        return ("-" if negative else "") + raw
    try:
        number = f"{float(raw.replace(',', '.')):.2f}"
    except ValueError:
        return str(value)
    whole, decimals = number.split(".")
    groups = []
    while whole:
        groups.append(whole[-3:])
        whole = whole[:-3]
    return ("-" if negative else "") + ".".join(reversed(groups)) + "," + decimals


def date_fr(value) -> str:
    parts = str(value or "").split("-")
    if len(parts) == 3 and all(part.isdigit() for part in parts):
        year, month, day = parts
        return f"{int(day):02d}/{int(month):02d}/{year}"
    return str(value or "")


def period_fr(value) -> str:
    year, _, month = str(value or "").partition("-")
    if year.isdigit() and month.isdigit() and 1 <= int(month) <= 12:
        return f"{MONTHS[int(month)]} {year}"
    return str(value or "")


@dataclass(frozen=True)
class PerAccount:
    number: str
    opened_on: str
    amount: str
    interest: str


@dataclass(frozen=True)
class PerSnapshot:
    period: str
    period_label: str
    updated_on: str
    amount: str
    interest: str
    accounts: tuple[PerAccount, ...]
    reported_on: str = ""
    """US-1024 : date du rapport, AAAA-MM-JJ ; vide si l'export ne la donne pas."""
    name: str = ""


def _iso_day(value) -> str:
    parts = str(value or "").split("-")
    return str(value) if len(parts) == 3 and all(part.isdigit() for part in parts) else ""


def statement(document: dict | None) -> tuple[PerSnapshot, ...]:
    """Toutes les photos, de la plus récente à la plus ancienne ; vide s'il n'y en a pas."""
    photos = sorted(
        (document or {}).get("snapshots") or [],
        key=lambda item: (str(item.get("periode", "")), str(item.get("date_rapport", ""))),
        reverse=True,
    )
    return tuple(
        PerSnapshot(
            period=str(photo.get("periode") or ""),
            period_label=period_fr(photo.get("periode")),
            updated_on=date_fr(photo.get("date_rapport")),
            amount=amount_fr(photo.get("balance")),
            interest=amount_fr(photo.get("interet_cumule")),
            reported_on=_iso_day(photo.get("date_rapport")),
            name=" ".join(str(photo.get("nom") or "").split()),
            accounts=tuple(
                PerAccount(
                    number=str(account.get("numero") or ""),
                    opened_on=date_fr(account.get("date_ouverture")),
                    amount=amount_fr(account.get("balance")),
                    interest=amount_fr(account.get("interet_cumule")),
                )
                for account in photo.get("comptes") or []
            ),
        )
        for photo in photos
    )
