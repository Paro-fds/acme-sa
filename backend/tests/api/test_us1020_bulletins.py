"""US-1020 — Voir mes bulletins de paie (lot 5, PAM), sur les bulletins fictifs de `backend/demo/per`."""

from app.per.domain.payslips import payslip_key, payslips
from app.per.domain.ports import PerSourceUnavailable
from tests.employees import EMP_A, EMP_B

PAYSLIPS = "/api/me/per/payslips"


def test_ca01_du_plus_recent_au_plus_ancien(employee_client):
    response = employee_client(EMP_A).get(PAYSLIPS)

    assert response.status_code == 200, response.text
    slips = response.json()
    assert [(s["period_label"], s["paid_on"], s["net"]) for s in slips] == [
        ("septembre 2026", "30/09/2026", "38.880,00"),
        ("août 2026", "31/08/2026", "36.120,00"),
    ]
    assert (slips[0]["earnings"], slips[0]["deductions"]) == ("45.000,00", "6.120,00")


def test_ca02_ni_lignes_a_zero_ni_charges_de_l_employeur(employee_client):
    lines = employee_client(EMP_A).get(PAYSLIPS).json()[0]["lines"]

    assert [line["label"] for line in lines] == ["Salaire de base", "Prime de transport", "IRI", "ONA employé"]
    assert all(line["nature"] != "employeur" for line in lines)


def test_ca03_sans_bulletin_une_liste_vide(employee_client):
    response = employee_client(EMP_B).get(PAYSLIPS)

    assert (response.status_code, response.json()) == (200, [])


def test_ca03_stockage_en_panne(employee_client, container):
    class Down:
        def read(self, key):
            raise PerSourceUnavailable("S3")

    container.per_source = Down()
    response = employee_client(EMP_A).get(PAYSLIPS)

    assert response.status_code == 503


def test_ca04_la_cle_vient_du_code_de_la_session(employee_client, container):
    keys = []

    class Spy:
        def read(self, key):
            keys.append(key)
            return None

    container.per_source = Spy()
    employee_client(EMP_A).get(PAYSLIPS, params={"code": "AC-1008"})

    assert keys == ["pam/balances/payslip/AC-1001.json"] == [payslip_key("ac-1001")]


def test_ca04_document_vide():
    assert payslips(None) == () and payslips({"bulletins": []}) == ()


def test_reserve_a_l_employe_connecte(client):
    assert client.get(PAYSLIPS).status_code == 401
