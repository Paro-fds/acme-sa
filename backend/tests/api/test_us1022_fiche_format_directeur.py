"""US-1022 — Voir ma fiche de paie au format du directeur (`payslip.html`, version du 2026-10-29), bulletins fictifs."""

import pytest

from app.per.domain.payslip_sheet import CODES, NoPayslipForPeriod, payslip_sheet
from app.per.infrastructure.payslip_html import HtmlPayslipRenderer
from tests.employees import EMP_A, EMP_B

SEPTEMBER = "/api/me/per/payslips/2026-09.html"
NBSP = " "
DOCUMENT = {
    "bulletins": [
        {
            "periode": "2026-09",
            "date_paie": "2026-09-30",
            "nom": "JOSEPH Jean",
            "gains": "45000.00",
            "retenues": "6120.00",
            "total": "38880.00",
            "lignes": [
                {"code": "AA", "libelle": "Salaire de base", "nature": "gain", "montant": "42000.00"},
                {"code": "AB", "libelle": "Prime de transport", "nature": "gain", "montant": "3000.00"},
                {"code": "AF", "libelle": "Bonus accumulé", "nature": "gain", "montant": "0.00"},
                {"code": "AJ", "libelle": "IRI", "nature": "retenue", "montant": "3420.00"},
            ],
        }
    ]
}


def _with_bonus(amount: str) -> dict:
    slip = {**DOCUMENT["bulletins"][0]}
    slip["lignes"] = [*slip["lignes"][:2], {"code": "AF", "nature": "gain", "montant": amount}, *slip["lignes"][3:]]
    return {"bulletins": [slip]}


def test_ca01_la_fiche_du_format_du_directeur(employee_client):
    response = employee_client(EMP_A).get(SEPTEMBER)

    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/html")
    page = response.text
    for expected in ("FICHE DE PAIE", "Septembre 2026", "Direction des Ressources Humaines", "Gains et indemnités",
                     "Charges patronales", "Taxes et cotisations légales", "Autres retenues", "NET À PAYER",
                     "Signature de l'employé","Pour authentifier ce document (signature et sceau ACME)"):
        assert expected in page, expected
    assert "{{" not in page  # toutes les variables remplies
    assert 'src="data:image/jpeg;base64,' in page  # logo embarqué
    assert "<style>" in page and "googleapis" not in page and "<script" not in page


def test_ca02_rubriques_par_code_et_montants_du_format():
    sheet = payslip_sheet(DOCUMENT, "2026-09", "AC-1001")

    assert tuple(sheet.amounts) == CODES and len(CODES) == 27
    assert sheet.amounts["AA"] == f"42{NBSP}000,00"
    assert sheet.amounts["AB"] == f"3{NBSP}000,00"  # « Transport » du format, quel que soit le libellé de l'export
    assert sheet.amounts["AR"] == "0,00"  # absente
    assert (sheet.employee_code, sheet.name, sheet.paid_on) == ("AC-1001", "JOSEPH Jean", "30/09/2026")
    assert (sheet.position, sheet.assignment) == ("—", "—")
    assert (sheet.total_earnings, sheet.total_deductions) == (f"45{NBSP}000,00", f"6{NBSP}120,00")


def test_ca02_sans_bonus_le_net_est_celui_de_l_export():
    sheet = payslip_sheet(DOCUMENT, "2026-09", "AC-1001")

    assert sheet.net == f"38{NBSP}880,00"
    assert sheet.net_formula == "Total des gains − total des retenues"
    assert sheet.bonus_note == ""


def test_ca02_le_bonus_accumule_est_retire_du_net_et_annonce():
    sheet = payslip_sheet(_with_bonus("5865.33"), "2026-09", "AC-1001")

    assert sheet.net == f"33{NBSP}014,67"  # 38 880,00 − 5 865,33
    assert sheet.net_formula == "Total des gains − bonus accumulé − total des retenues"
    assert sheet.bonus_note == (
        f"Le montant 5{NBSP}865,33 HTG est hors du salaire net et est payé en décembre de l'année en cours."
    )
    page = HtmlPayslipRenderer.load().render(sheet)
    assert "est payé en décembre" in page and f"HTG 33{NBSP}014,67" in page


def test_ca02_les_valeurs_sont_echappees():
    hostile = {"bulletins": [{**DOCUMENT["bulletins"][0], "nom": "<script>alert(1)</script>"}]}

    page = HtmlPayslipRenderer.load().render(payslip_sheet(hostile, "2026-09", "AC-1001"))

    assert "<script>" not in page and "&lt;script&gt;" in page


@pytest.mark.parametrize("period", ["2026-07", "2026-9", "septembre", "2026-09-30"])
def test_ca03_periode_inconnue_ou_mal_ecrite(employee_client, period):
    response = employee_client(EMP_A).get(f"/api/me/per/payslips/{period}.html")

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Aucune fiche de paie n'est disponible pour cette période."


def test_ca03_sans_fiche(employee_client):
    assert employee_client(EMP_B).get(SEPTEMBER).status_code == 404


def test_ca03_la_cle_vient_du_code_de_la_session(employee_client, container):
    keys = []

    class Spy:
        def read(self, key):
            keys.append(key)
            return None

    container.per_source = Spy()
    employee_client(EMP_A).get(SEPTEMBER, params={"code": "AC-1008"})

    assert keys == ["pam/balances/payslip/AC-1001.json"]


def test_ca03_jamais_en_cache_affichable_seulement_dans_pam(employee_client, client):
    headers = employee_client(EMP_A).get(SEPTEMBER).headers

    assert headers["cache-control"] == "no-store"
    assert "frame-ancestors 'self'" in headers["content-security-policy"]
    assert "default-src 'none'" in headers["content-security-policy"]
    assert headers["x-frame-options"] == "SAMEORIGIN"
    assert client.get(SEPTEMBER).status_code == 401


def test_ca03_domaine_periode_absente():
    with pytest.raises(NoPayslipForPeriod):
        payslip_sheet(None, "2026-09", "AC-1001")
