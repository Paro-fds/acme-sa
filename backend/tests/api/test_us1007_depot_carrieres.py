"""US-1007 — Déposer une pièce dans Carrières (lot 5, PAM).

La base Carrières est la base fictive d'US-1000, créée au premier usage dans le dossier de données du test.
"""

import json

import pytest
from sqlalchemy import delete, select

from app.carrieres.infrastructure.tables import documents, employes, fichiers_document, journal_audit, vault_actifs
from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B

PIECES = "/api/me/pieces"
PDF = b"%PDF-1.7\n" + b"diplome de licence en gestion " * 40
JPEG = b"\xff\xd8\xff\xe0" + b"photo du certificat" * 40


@pytest.fixture
def ready(employee_client):
    """US-204 : le dépôt s'ouvre avec le dossier complet."""

    def connect(employee):
        client = employee_client(employee)
        complete_profile(client)
        return client

    return connect


def _deposit(client, content=PDF, name="Licence gestion.pdf", title=""):
    return client.post(PIECES, files={"file": (name, content, "application/octet-stream")}, data={"title": title})


def _engine(container):
    return container.carrieres._engine


def _documents_of(container, code):
    with _engine(container).connect() as connection:
        return connection.execute(
            select(documents).join(employes, employes.c.id == documents.c.employe_id)
            .where(employes.c.code_employe == code).order_by(documents.c.id)
        ).mappings().all()


# --- CA-01 : la pièce entre dans Carrières « à compléter », comme un dépôt de lot -----------------------


def test_ca01_la_piece_entre_a_completer(ready, container, clock):
    before = len(_documents_of(container, EMP_A.employee_code))

    response = _deposit(ready(EMP_A))

    assert response.status_code == 201, response.text
    assert response.json() | {"id": 0} == {"id": 0, "title": "Licence gestion", "status": "a_completer"}
    rows = _documents_of(container, EMP_A.employee_code)
    assert len(rows) == before + 1
    row = rows[-1]
    assert (row["statut"], row["type_document"], row["titre"]) == ("a_completer", "", "Licence gestion")
    assert row["date_document"] == clock.now().date()
    assert (row["imputeur_code"], row["imputeur_nom"]) == ("AC-1001", "Jean JOSEPH")
    assert (row["alignement"], row["categorie"], row["poste_vise"], row["lieu"]) == ("", "", "", "")
    assert (row["chemin_stockage"], row["taille_octets"], row["est_actif"]) == ("base", len(PDF), True)


def test_ca01_le_scan_est_stocke_dans_la_base_avec_son_type_reel(ready, container):
    document_id = _deposit(ready(EMP_A), JPEG, name="scan.pdf").json()["id"]  # le nom ne compte pas

    with _engine(container).connect() as connection:
        stored = connection.execute(
            select(fichiers_document).where(fichiers_document.c.document_id == document_id)
        ).mappings().one()
    assert (stored["type_mime"], bytes(stored["contenu"])) == ("image/jpeg", JPEG)


def test_ca01_l_intitule_saisi_sinon_le_nom_du_fichier(ready):
    client = ready(EMP_A)

    assert _deposit(client, title="  Certificat   Excel ").json()["title"] == "Certificat Excel"
    assert _deposit(client, JPEG, name="scans/attestation_stage.jpg").json()["title"] == "attestation stage"


# --- CA-02 : type, taille, doublon ---------------------------------------------------------------------


def test_ca02_type_non_reconnu_refuse(ready, container):
    before = len(_documents_of(container, EMP_A.employee_code))

    response = _deposit(ready(EMP_A), b"MZ\x90\x00 executable", name="diplome.pdf")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_CERTIFICATE_FILE"
    assert len(_documents_of(container, EMP_A.employee_code)) == before


def test_ca02_plus_de_4_mo_refuse(ready):
    response = _deposit(ready(EMP_A), b"%PDF-" + b"0" * (4 * 1024 * 1024))

    assert response.status_code == 422
    assert response.json()["error"]["message"] == "Le fichier dépasse 4 Mo. Réduisez-le, ou photographiez la pièce à nouveau."


def test_ca02_le_meme_fichier_deux_fois_est_refuse(ready, container):
    client = ready(EMP_A)
    assert _deposit(client).status_code == 201

    again = _deposit(client, name="autre nom.pdf")

    assert again.status_code == 409
    assert again.json()["error"] == {"code": "DUPLICATE_PIECE", "message": "Vous avez déjà déposé ce fichier. Il est dans vos pièces."}


def test_ca02_le_meme_fichier_pour_deux_employes_est_accepte(ready):
    assert _deposit(ready(EMP_A)).status_code == 201
    assert _deposit(ready(EMP_B)).status_code == 201


# --- CA-03 : le code doit être dans vault_actifs -----------------------------------------------------------


def test_ca03_hors_vault_actifs_contactez_la_drh(ready, container):
    with _engine(container).begin() as connection:
        connection.execute(delete(vault_actifs).where(vault_actifs.c.code_employe == EMP_B.employee_code))

    response = _deposit(ready(EMP_B))

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONTACT_HR"


# --- CA-04 : entrée versement_document dans le journal de Carrières -----------------------------------------


def test_ca04_le_journal_de_carrieres_garde_le_versement(ready, container):
    document_id = _deposit(ready(EMP_A)).json()["id"]

    with _engine(container).connect() as connection:
        entry = connection.execute(
            select(journal_audit).where(journal_audit.c.action == "versement_document").order_by(journal_audit.c.id.desc())
        ).mappings().first()
    assert (entry["cible_type"], entry["cible_id"], entry["acteur_role"]) == ("document", "AC-1001", "employe")
    assert json.loads(entry["detail"]) == {"document_id": document_id, "origine": "PAM"}


# --- US-204 : dossier complet ------------------------------------------------------------------------------


def test_us204_dossier_incomplet_le_depot_est_ferme(employee_client):
    response = _deposit(employee_client(EMP_A))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PROFILE_INCOMPLETE"


# --- Sécurité ---------------------------------------------------------------------------------------------


def test_reserve_a_l_employe_connecte(client):
    assert _deposit(client).status_code == 401
