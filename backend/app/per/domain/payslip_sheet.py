"""US-1022 : la fiche de paie d'un mois, au format du directeur (`payslip.html`, version du 2026-10-29).

Règles reprises de `noyau.py` du directeur (`rendre_bulletin_html`, `salaire_net`, `_formule_net`, `_mention_bonus`) :
la période AAAA-MM est la seule donnée du navigateur ; chaque rubrique du format est lue par son code d'export,
« 0,00 » si elle est absente ; le net à payer retire le bonus accumulé (AF), payé en décembre et non avec le mois.
"""

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from app.per.domain.statement import amount_fr, date_fr, period_fr
from app.shared.domain.errors import NotFound

_PERIOD = re.compile(r"^\d{4}-\d{2}$")
MISSING = "—"
BONUS = "AF"

# Rubriques du format, dans l'ordre de `payslip.html` (CODES_BULLETIN du directeur)
CODES = (
    "AA", "AR", "AB", "AC", "AE", "AX", "AF", "AZ", "AS",
    "AJ", "AG", "AH", "AN", "AO", "AI", "AT", "AU", "AW",
    "AP", "AQ", "AY", "BB", "BA", "AK", "AL", "AM", "AV",
)


class NoPayslipForPeriod(NotFound):
    code = "NO_PAYSLIP"
    message = "Aucune fiche de paie n'est disponible pour cette période."


@dataclass(frozen=True)
class PayslipSheet:
    employee_code: str
    name: str
    period_label: str
    paid_on: str
    position: str
    assignment: str
    amounts: dict[str, str]
    """Montant de chaque code du format, déjà mis en forme (« 70 384,00 »)."""
    total_earnings: str
    total_deductions: str
    net: str
    net_formula: str
    bonus_note: str
    """Phrase sous le net quand un bonus accumulé existe ; vide sinon."""


def sheet_amount(value) -> str:
    """« 70384 » → « 70 384,00 », espace insécable pour les milliers (`montant_bulletin` du directeur)."""
    return amount_fr(value).replace(".", " ")


def _decimal(value) -> Decimal:
    raw = str(value if value is not None else "0").strip().replace(" ", "").replace(" ", "") or "0"
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    try:
        return Decimal(raw)
    except InvalidOperation:
        return Decimal("0")


def payslip_sheet(document: dict | None, period: str, employee_code: str) -> PayslipSheet:
    if not _PERIOD.fullmatch(period or ""):
        raise NoPayslipForPeriod()
    item = next((b for b in (document or {}).get("bulletins") or [] if str(b.get("periode") or "") == period), None)
    if item is None:
        raise NoPayslipForPeriod()

    raw: dict[str, str] = {}
    for line in item.get("lignes") or []:
        raw.setdefault(str(line.get("code") or "").upper(), line.get("montant"))
    bonus = _decimal(raw.get(BONUS)).quantize(Decimal("0.01"))
    net = (_decimal(item.get("total")) - bonus).quantize(Decimal("0.01"))
    label = period_fr(period)
    return PayslipSheet(
        employee_code=employee_code,
        name=" ".join(str(item.get("nom") or "").split()),
        period_label=label[:1].upper() + label[1:],
        paid_on=date_fr(item.get("date_paie")),
        position=MISSING,
        assignment=MISSING,
        amounts={code: sheet_amount(raw.get(code)) for code in CODES},
        total_earnings=sheet_amount(item.get("gains")),
        total_deductions=sheet_amount(item.get("retenues")),
        net=sheet_amount(f"{net:f}"),
        net_formula=(
            "Total des gains − bonus accumulé − total des retenues" if bonus > 0 else "Total des gains − total des retenues"
        ),
        bonus_note=(
            f"Le montant {sheet_amount(f'{bonus:f}')} HTG est hors du salaire net et est payé en décembre de l'année "
            "en cours."
            if bonus > 0
            else ""
        ),
    )
