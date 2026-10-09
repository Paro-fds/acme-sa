"""US-303 — Suivre mon certificat (EF-303 ; RG-26). « À corriger » et redépôt : lot 2 ; notification : US-701."""

from tests.api.test_us301_depot import _deposit
from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B

CERTIFICATES = "/api/me/certificates"


def test_ca01_chaque_certificat_avec_son_statut_le_plus_recent_d_abord(employee_client, clock):
    client = employee_client(EMP_A)
    complete_profile(client)
    first = _deposit(client, title="Baccalauréat", level="BACCALAUREAT", domain="").json()
    clock.advance(minutes=5)
    second = _deposit(client).json()

    listed = client.get(CERTIFICATES).json()

    assert [(c["id"], c["status"], c["status_label"]) for c in listed["certificates"]] == [
        (second["id"], "RECEIVED", "Reçu"),
        (first["id"], "RECEIVED", "Reçu"),
    ]
    assert listed["limit"] == 20
    assert listed["validated_level"] is None  # US-207 : aucun certificat validé avant le lot 2


def test_ca01_un_employe_ne_voit_que_ses_certificats(employee_client):
    client = employee_client(EMP_A)
    complete_profile(client)
    _deposit(client)

    assert employee_client(EMP_B).get(CERTIFICATES).json()["certificates"] == []


def test_ca01_la_liste_ne_montre_ni_cle_ni_nom_de_stockage(employee_client):
    client = employee_client(EMP_A)
    complete_profile(client)
    _deposit(client)

    listed = str(client.get(CERTIFICATES).json())

    assert "certificates/" not in listed
    assert "storage" not in listed
