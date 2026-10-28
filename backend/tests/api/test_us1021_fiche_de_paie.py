"""US-1021 — Télécharger ma fiche de paie en PDF (lot 5, PAM), sur les bulletins fictifs de `backend/demo/per`."""

import pytest

from app.per.domain.payslip_sheet import NoPayslipForPeriod, payslip_sheet
from app.per.infrastructure.payslip_pdf import PdfPayslipRenderer
from tests.employees import EMP_A, EMP_B

SEPTEMBER = "/api/me/per/payslips/2026-09.pdf"


def _text(pdf: bytes) -> str:
    """Le PDF est écrit sans compression (comme `fiche_paie.py`) : son texte se lit directement."""
    return pdf.decode("cp1252", errors="replace")


def test_ca01_la_fiche_du_mois_se_telecharge(employee_client):
    response = employee_client(EMP_A).get(SEPTEMBER)

    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="fiche-paie-2026-09.pdf"'
    assert response.content.startswith(b"%PDF-1.4") and response.content.rstrip().endswith(b"%%EOF")


def test_ca02_contenu_de_la_fiche_du_directeur(employee_client):
    text = _text(employee_client(EMP_A).get(SEPTEMBER).content)

    for expected in (
        "ACME SA", "Fiche de paie", "AC-1001", "septembre 2026", "30/09/2026",
        "Gains", "Salaire de base", "42.000,00", "Prime de transport", "Retenues", "IRI", "3.420,00",
        "Net \xe0 payer", "38.880,00",
        "Charges employeur — pour information", "ONA employeur", "Total des charges employeur", "2.700,00",
        "Document personnel. ACME SA. Ne le transmettez pas.",
    ):
        assert expected in text, expected
    assert "Prime exceptionnelle" not in text  # ligne à zéro
    assert "/Subtype /Image" in text  # logo


def test_ca02_le_nom_vient_du_bulletin_sinon_du_dossier():
    document = {"bulletins": [{"periode": "2026-09", "nom": "JOSEPH Jean-Marc", "total": "1"}]}

    assert payslip_sheet(document, "2026-09", "AC-1001", "Jean JOSEPH").name == "JOSEPH Jean-Marc"
    del document["bulletins"][0]["nom"]
    assert payslip_sheet(document, "2026-09", "AC-1001", "Jean JOSEPH").name == "Jean JOSEPH"


def test_ca02_une_longue_fiche_continue_sur_une_seconde_page():
    lines = [{"libelle": f"Rubrique {i}", "nature": "gain", "montant": "10.00"} for i in range(60)]
    sheet = payslip_sheet({"bulletins": [{"periode": "2026-09", "lignes": lines}]}, "2026-09", "AC-1001", "Jean")

    pdf = PdfPayslipRenderer(logo=None).render(sheet)

    assert b"/Count 2" in pdf and r"Fiche de paie \(suite\)" in _text(pdf)  # parenthèses échappées en PDF


@pytest.mark.parametrize("period", ["2026-07", "2026-9", "septembre", "2026-09-30"])
def test_ca03_periode_inconnue_ou_mal_ecrite(employee_client, period):
    response = employee_client(EMP_A).get(f"/api/me/per/payslips/{period}.pdf")

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Aucun bulletin n'est disponible pour cette période."


def test_ca03_sans_bulletin(employee_client):
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


def test_ca03_jamais_en_cache_et_reserve_a_l_employe_connecte(employee_client, client):
    assert employee_client(EMP_A).get(SEPTEMBER).headers["cache-control"] == "no-store"
    assert client.get(SEPTEMBER).status_code == 401


def test_ca03_domaine_periode_absente():
    with pytest.raises(NoPayslipForPeriod):
        payslip_sheet(None, "2026-09", "AC-1001", "Jean")
