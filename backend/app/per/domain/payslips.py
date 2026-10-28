"""US-1020 : mes bulletins de paie, lus dans `pam/balances/payslip/{CODE}.json` (export Shivam).

Règles reprises du module du directeur (`bulletins_employe`, `montrerBulletin`) : du plus récent au plus ancien ;
les lignes à zéro sont omises, les charges de l'employeur ne sont pas montrées à l'employé.
"""

import re
from dataclasses import dataclass

from app.per.domain.statement import PREFIX, NoBalance, amount_fr, date_fr, period_fr

_CODE = re.compile(r"^[A-Z0-9-]{4,16}$")


def payslip_key(employee_code: str, prefix: str = PREFIX) -> str:
    code = "".join((employee_code or "").split()).upper()
    if not _CODE.fullmatch(code):
        raise NoBalance()
    return f"{prefix.strip('/')}/payslip/{code}.json"


def is_zero(value) -> bool:
    raw = str(value if value is not None else "0").replace(" ", "").replace(".", "").replace(",", "")
    return set(raw.strip("-")) <= {"0"}


@dataclass(frozen=True)
class PayslipLine:
    label: str
    nature: str
    amount: str


@dataclass(frozen=True)
class Payslip:
    period: str
    period_label: str
    paid_on: str
    earnings: str
    deductions: str
    net: str
    lines: tuple[PayslipLine, ...]


def payslips(document: dict | None) -> tuple[Payslip, ...]:
    items = sorted(
        (document or {}).get("bulletins") or [],
        key=lambda item: (str(item.get("periode", "")), str(item.get("date_paie", ""))),
        reverse=True,
    )
    return tuple(
        Payslip(
            period=str(item.get("periode") or ""),
            period_label=period_fr(item.get("periode")),
            paid_on=date_fr(item.get("date_paie")),
            earnings=amount_fr(item.get("gains")),
            deductions=amount_fr(item.get("retenues")),
            net=amount_fr(item.get("total")),
            lines=tuple(
                PayslipLine(str(line.get("libelle") or ""), str(line.get("nature") or ""), amount_fr(line.get("montant")))
                for line in item.get("lignes") or []
                if not is_zero(line.get("montant")) and line.get("nature") != "employeur"
            ),
        )
        for item in items
    )
