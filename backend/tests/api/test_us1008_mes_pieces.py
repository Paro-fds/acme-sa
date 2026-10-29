"""US-1008 — Suivre mes pièces (lot 5, PAM), sur la base Carrières fictive d'US-1000."""

import pytest

from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B, EMP_H1

PIECES = "/api/me/pieces"
PDF = b"%PDF-1.7\n" + b"certificat excel " * 50


@pytest.fixture
def ready(employee_client):
    """US-204 : le dépôt s'ouvre avec le dossier complet."""

    def connect(employee):
        client = employee_client(employee)
        complete_profile(client)
        return client

    return connect


def _pieces(client) -> list[dict]:
    response = client.get(PIECES)
    assert response.status_code == 200, response.text
    return response.json()


# --- CA-01 : mes formations de Carrières, y compris celles recueillies par la DRH ------------------------


def test_ca01_formations_et_depots_sans_les_lettres(ready):
    pieces = _pieces(ready(EMP_A))

    assert {(p["title"], p["type_label"], p["status_label"]) for p in pieces} == {
        ("Licence en sciences comptables", "Licence", "Approuvée"),
        ("Certificat en analyse de crédit", "Certificat", "En attente"),
        ("scan-diplome.pdf", None, "À compléter"),
    }  # ni la lettre de promotion ni la lettre de blâme (US-1009)


def test_ca01_un_depot_apparait_tout_de_suite_a_completer(ready):
    client = ready(EMP_A)
    client.post(PIECES, files={"file": ("Excel.pdf", PDF, "application/pdf")}, data={"title": ""})

    newest = _pieces(client)[0]
    assert (newest["title"], newest["status"], newest["status_label"], newest["has_file"]) == (
        "Excel", "a_completer", "À compléter", True,
    )


def test_ca01_seulement_mes_pieces(ready):
    titles = {p["title"] for p in _pieces(ready(EMP_B))}

    assert titles == {"photo-certificat.jpg"}


# --- CA-02 : une pièce refusée montre son motif -----------------------------------------------------------


def test_ca02_refusee_avec_le_motif(ready):
    refused = [p for p in _pieces(ready(EMP_H1)) if p["status"] == "refuse"]

    assert len(refused) == 1
    assert refused[0]["status_label"] == "Refusée" and refused[0]["refusal_reason"]


def test_ca02_pas_de_motif_hors_refus(ready):
    assert all(p["refusal_reason"] is None for p in _pieces(ready(EMP_A)))


# --- CA-03 : le scan, seulement le mien ---------------------------------------------------------------------


def test_ca03_je_vois_mon_scan(ready):
    client = ready(EMP_A)
    piece_id = client.post(PIECES, files={"file": ("Excel.pdf", PDF, "application/pdf")}).json()["id"]

    response = client.get(f"{PIECES}/{piece_id}/file")
    assert response.status_code == 200
    assert response.content == PDF and response.headers["content-type"] == "application/pdf"
    assert response.headers["cache-control"] == "private, no-store"


def test_ca03_jamais_le_scan_d_un_autre(ready):
    other = ready(EMP_B).post(PIECES, files={"file": ("x.pdf", PDF, "application/pdf")}).json()["id"]

    response = ready(EMP_A).get(f"{PIECES}/{other}/file")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PIECE_NOT_FOUND"


def test_reserve_a_l_employe_connecte(client):
    assert client.get(PIECES).status_code == 401
    assert client.get(f"{PIECES}/1/file").status_code == 401
