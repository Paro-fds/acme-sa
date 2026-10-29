"""US-1022 : la fiche de paie remplie à partir de `payslip.html` et `payslip.css` du directeur (version du 2026-10-29).

Comme `rendre_bulletin_html` de son `noyau.py` : le commentaire d'en-tête du modèle est retiré, la feuille de style est
mise en ligne (sans la police Google, la page n'appelle rien au-dehors), le logo devient une image `data:`, chaque
`{{VARIABLE}}` est remplacée par une valeur échappée.
"""

import base64
import re
from html import escape
from pathlib import Path

from app.per.domain.payslip_sheet import PayslipSheet

HERE = Path(__file__).resolve().parent
TEMPLATES = HERE / "templates"
LOGO = HERE / "logo_acme.jpg"


class HtmlPayslipRenderer:
    """Adaptateur du port `PayslipRenderer`."""

    _cached: "HtmlPayslipRenderer | None" = None

    def __init__(self, template: str, style: str, logo: bytes | None) -> None:
        self._template = re.sub(r"<!--.*?-->", "", template, count=1, flags=re.DOTALL)
        lines = [line for line in style.splitlines() if "fonts.googleapis.com" not in line and not line.strip().startswith("@import")]
        self._style = "\n".join(lines)
        self._logo = "data:image/jpeg;base64," + base64.b64encode(logo).decode("ascii") if logo else ""

    @classmethod
    def load(cls) -> "HtmlPayslipRenderer":
        """Modèle lu une fois par instance de la fonction."""
        if cls._cached is None:
            cls._cached = cls(
                (TEMPLATES / "payslip.html").read_text(encoding="utf-8"),
                (TEMPLATES / "payslip.css").read_text(encoding="utf-8"),
                LOGO.read_bytes() if LOGO.is_file() else None,
            )
        return cls._cached

    def render(self, sheet: PayslipSheet) -> str:
        values = {
            "PERIODE": sheet.period_label,
            "MATRICULE": sheet.employee_code,
            "NOM_COMPLET": sheet.name,
            "DATE_PAIE": sheet.paid_on,
            "POSTE": sheet.position,
            "AFFECTATION": sheet.assignment,
            "TOTAL_GAINS": sheet.total_earnings,
            "TOTAL_RETENUES": sheet.total_deductions,
            "NET_A_PAYER": sheet.net,
            "NET_FORMULE": sheet.net_formula,
            "MENTION_BONUS": sheet.bonus_note,
            **sheet.amounts,
        }
        html = self._template.replace('<link rel="stylesheet" href="payslip.css">', f"<style>\n{self._style}\n</style>", 1)
        if self._logo:
            html = html.replace('src="logo-acme.jpg"', f'src="{self._logo}"', 1)
        for key, value in values.items():
            html = html.replace("{{" + key + "}}", escape(value))
        return html
