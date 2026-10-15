"""US-118 — Voir le fichier de mon certificat (EF-303, RG-26).

Critères d'acceptation :
- CA-01 : l'employé ouvre le fichier déposé pour chacun de ses certificats.
- CA-02 : il ne voit que ses propres fichiers ; celui d'un autre répond « introuvable ».
- CA-03 : un certificat archivé (remplacé) garde son fichier consultable.
- CA-04 : un fichier absent du stockage donne un message clair, pas une erreur serveur.
"""

from tests.api.test_us301_depot import PDF, _deposit
from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B

CERTIFICATES = "/api/me/certificates"


def _file_url(certificate_id):
    return f"{CERTIFICATES}/{certificate_id}/file"


def _ready(employee_client, employee=EMP_A):
    client = employee_client(employee)
    complete_profile(client)
    return client


def test_ca01_l_employe_ouvre_le_fichier_de_son_certificat(employee_client):
    client = _ready(employee_client)
    certificate_id = _deposit(client).json()["id"]

    response = client.get(_file_url(certificate_id))

    assert response.status_code == 200
    assert response.content == PDF
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("inline;")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "private, no-store"


def test_ca02_le_fichier_d_un_autre_employe_est_introuvable(employee_client):
    certificate_id = _deposit(_ready(employee_client, EMP_A)).json()["id"]
    other = _ready(employee_client, EMP_B)

    response = other.get(_file_url(certificate_id))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CERTIFICATE_NOT_FOUND"


def test_ca02_un_certificat_inconnu_est_introuvable(employee_client):
    response = _ready(employee_client).get(_file_url("inconnu"))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "CERTIFICATE_NOT_FOUND"


def test_ca02_sans_session_le_fichier_reste_ferme(client):
    assert client.get(_file_url("inconnu")).status_code == 401


def test_ca03_un_certificat_remplace_garde_son_fichier(employee_client, admin_client):
    client = _ready(employee_client)
    old_id = _deposit(client).json()["id"]
    assert admin_client.post(f"/api/admin/validation/{old_id}/decide", json={"decision": "VALIDATED"}).status_code == 200
    assert _deposit(client, title="Master en comptabilité", level="MASTER", replaces_id=old_id).status_code == 201

    response = client.get(_file_url(old_id))

    assert response.status_code == 200
    assert response.content == PDF


def test_ca04_un_fichier_absent_du_stockage_donne_un_message_clair(employee_client, container):
    client = _ready(employee_client)
    certificate_id = _deposit(client).json()["id"]
    for file in container.certificates.files_of(certificate_id):
        container.certificate_storage.delete(file.storage_key)

    response = client.get(_file_url(certificate_id))

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "CERTIFICATE_FILE_MISSING"
    assert "fichier" in error["message"]
