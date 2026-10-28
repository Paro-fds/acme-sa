"""US-1021 : la fiche de paie d'un mois, à télécharger en PDF.

Règles reprises du module du directeur (`Application.fiche`, `fiche_paie.construire`) : la période AAAA-MM est la
seule donnée du navigateur ; le nom vient du bulletin ; gains, retenues, net à payer, puis les charges de
l'employeur « pour information » (l'écran, US-1020, ne les montre pas) ; les lignes à zéro sont omises.
"""

import re
from dataclasses import dataclass

from app.per.domain.payslips import PayslipLine, is_zero
from app.per.domain.statement import amount_fr, date_fr, period_fr
from app.shared.domain.errors import NotFound

_PERIOD = re.compile(r"^\d{4}-\d{2}$")


class NoPayslipForPeriod(NotFound):
    code = "NO_PAYSLIP"
    message = "Aucun bulletin n'est disponible pour cette période."


@dataclass(frozen=True)
class PayslipSheet:
    name: str
    employee_code: str
    period: str
    period_label: str
    paid_on: str
    earnings: tuple[PayslipLine, ...]
    deductions: tuple[PayslipLine, ...]
    net: str
    employer: tuple[PayslipLine, ...]
    employer_total: str


def sheet_filename(period: str) -> str:
    return f"fiche-paie-{period}.pdf"


def payslip_sheet(document: dict | None, period: str, employee_code: str, fallback_name: str) -> PayslipSheet:
    if not _PERIOD.fullmatch(period or ""):
        raise NoPayslipForPeriod()
    item = next((b for b in (document or {}).get("bulletins") or [] if str(b.get("periode") or "") == period), None)
    if item is None:
        raise NoPayslipForPeriod()

    def lines(nature: str) -> tuple[PayslipLine, ...]:
        return tuple(
            PayslipLine(str(line.get("libelle") or line.get("code") or ""), nature, amount_fr(line.get("montant")))
            for line in item.get("lignes") or []
            if line.get("nature") == nature and not is_zero(line.get("montant"))
        )

    return PayslipSheet(
        name=" ".join(str(item.get("nom") or "").split()) or fallback_name,
        employee_code=employee_code,
        period=period,
        period_label=period_fr(period),
        paid_on=date_fr(item.get("date_paie")),
        earnings=lines("gain"),
        deductions=lines("retenue"),
        net=amount_fr(item.get("total")),
        employer=lines("employeur"),
        employer_total=amount_fr(item.get("charges_employeur")),
    )
