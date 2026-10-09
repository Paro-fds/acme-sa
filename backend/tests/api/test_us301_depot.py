"""US-301 — Déposer un certificat depuis mon téléphone (EF-301, EF-302, EF-308 ; RG-20 → RG-25, RG-31 ; D-04, D-07).

Sur le poste du développeur, le stockage local reçoit le dépôt signé par une adresse dédiée ; en ligne, le
navigateur envoie le fichier directement au stockage S3 (CA-06).
"""

import re

import pytest

from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B

CERTIFICATES = "/api/me/certificates"
UPLOADS = "/api/me/certificates/uploads"
PDF = b"%PDF-1.7\n" + b"0" * 2000
FIELDS = {
    "certificate_type": "DIPLOME",
    "level": "LICENCE",
    "title": "Licence en sciences comptables",
    "institution": "Université d'État d'Haïti",
    "year": "2019",
    "foreign": False,
    "country": "",
    "domain": "COMPTABILITE",
    "domain_other": "",
}


@pytest.fixture
def ready(employee_client):
    """Client d'un employé au profil complet (US-204)."""

    def connect(employee=EMP_A):
        client = employee_client(employee)
        complete_profile(client)
        return client

    return connect


def _upload(client, content=PDF, content_type="application/pdf"):
    ticket = client.post(UPLOADS, json={"content_type": content_type, "size_bytes": len(content)})
    assert ticket.status_code == 200, ticket.text
    ticket = ticket.json()
    assert ticket["method"] == "PUT"
    assert client.put(ticket["url"], content=content, headers=ticket["headers"]).status_code == 204
    return ticket["upload_id"]


def _deposit(client, content=PDF, **changes):
    upload_id = _upload(client, content)
    return client.post(CERTIFICATES, json=FIELDS | changes | {"upload_id": upload_id, "original_name": "licence.pdf"})


# --- Verrou (US-204) ---------------------------------------------------------------------------


def test_profil_incomplet_le_depot_reste_ferme(employee_client):
    response = employee_client(EMP_A).post(UPLOADS, json={"content_type": "application/pdf", "size_bytes": 100})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "PROFILE_INCOMPLETE"


# --- Dépôt nominal -----------------------------------------------------------------------------


def test_un_certificat_depose_est_recu(ready, clock):
    client = ready()

    response = _deposit(client)

    assert response.status_code == 201, response.text
    certificate = response.json()
    assert (certificate["status"], certificate["status_label"]) == ("RECEIVED", "Reçu")
    assert (certificate["type_label"], certificate["level_label"], certificate["domain_label"]) == (
        "Diplôme",
        "Licence",
        "Comptabilité",
    )
    assert certificate["submitted_at"] == clock.now().isoformat().replace("+00:00", "Z")
    assert [c["id"] for c in client.get(CERTIFICATES).json()["certificates"]] == [certificate["id"]]


# --- CA-01 : PDF, JPG, PNG vérifiés sur le contenu ; 5 Mo au plus ---------------------------------


def test_ca01_un_fichier_deguise_est_refuse_et_supprime(ready, container):
    client = ready()

    response = _deposit(client, content=b"MZ\x90\x00 programme deguise en pdf")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_CERTIFICATE_FILE"
    assert list(container.settings.certificates_dir.rglob("*.*")) == []


def test_ca01_un_type_annonce_hors_liste_est_refuse_avant_l_envoi(ready):
    response = ready().post(UPLOADS, json={"content_type": "image/gif", "size_bytes": 100})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UNSUPPORTED_CERTIFICATE_FILE"


def test_ca01_plus_de_5_mo_refuse(ready):
    response = ready().post(UPLOADS, json={"content_type": "application/pdf", "size_bytes": 5 * 1024 * 1024 + 1})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CERTIFICATE_FILE_TOO_LARGE"


def test_ca01_un_fichier_plus_lourd_qu_annonce_est_refuse(ready, container):
    client = ready()
    ticket = client.post(UPLOADS, json={"content_type": "application/pdf", "size_bytes": 100}).json()

    response = client.put(ticket["url"], content=b"%PDF-" + b"0" * (5 * 1024 * 1024), headers=ticket["headers"])

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "CERTIFICATE_FILE_TOO_LARGE"


# --- CA-03, CA-04 : champs, année, 20 certificats au plus ------------------------------------------


def test_ca03_un_champ_manquant_garde_le_fichier_pour_reessayer(ready):
    client = ready()
    upload_id = _upload(client)

    missing = client.post(CERTIFICATES, json=FIELDS | {"institution": "", "upload_id": upload_id, "original_name": "a.pdf"})
    fixed = client.post(CERTIFICATES, json=FIELDS | {"upload_id": upload_id, "original_name": "a.pdf"})

    assert (missing.status_code, missing.json()["error"]["field"]) == (422, "institution")
    assert fixed.status_code == 201


def test_ca04_vingt_certificats_au_plus(ready, container, monkeypatch):
    client = ready()
    monkeypatch.setattr(container.settings, "max_certificates_per_employee", 2)
    _deposit(client)
    _deposit(client)

    response = client.post(UPLOADS, json={"content_type": "application/pdf", "size_bytes": 100})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "TOO_MANY_CERTIFICATES"


def test_ca04_la_limite_par_defaut_est_20(container):
    assert container.settings.max_certificates_per_employee == 20


# --- CA-05 : nom aléatoire ---------------------------------------------------------------------


def test_ca05_le_fichier_est_enregistre_sous_un_nom_aleatoire(ready, container):
    client = ready()
    certificate = _deposit(client).json()

    [stored] = [path for path in container.settings.certificates_dir.rglob("*") if path.is_file()]
    assert "licence" not in stored.name
    assert re.fullmatch(r"[0-9a-f]{32}", stored.name)
    [file] = container.certificates.files_of(certificate["id"])
    assert (file.original_name, file.content_type, file.size_bytes) == ("licence.pdf", "application/pdf", len(PDF))


# --- CA-06 : dépôt signé, isolation ----------------------------------------------------------------


def test_ca06_le_depot_signe_donne_une_adresse_et_un_identifiant(ready):
    ticket = ready().post(UPLOADS, json={"content_type": "application/pdf", "size_bytes": 100}).json()

    assert re.fullmatch(r"[0-9a-f]{32}", ticket["upload_id"])
    assert ticket["url"].endswith(ticket["upload_id"])
    assert ticket["headers"] == {"Content-Type": "application/pdf"}


def test_ca06_un_employe_ne_peut_pas_utiliser_le_depot_d_un_autre(ready, employee_client):
    client_a = ready(EMP_A)
    upload_id = _upload(client_a)
    client_b = ready(EMP_B)

    response = client_b.post(CERTIFICATES, json=FIELDS | {"upload_id": upload_id, "original_name": "a.pdf"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UPLOAD_NOT_FOUND"


def test_ca06_un_identifiant_de_depot_mal_forme_est_refuse(ready):
    response = ready().post(CERTIFICATES, json=FIELDS | {"upload_id": "../../secret", "original_name": "a.pdf"})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "UPLOAD_NOT_FOUND"


def test_le_formulaire_donne_les_listes_et_les_limites(ready):
    form = ready().get("/api/me/certificates/form").json()

    assert [t["value"] for t in form["types"]] == ["DIPLOME", "CERTIFICAT", "ATTESTATION", "AUTRE"]
    assert len(form["levels"]) == 10
    licence = next(level for level in form["levels"] if level["value"] == "LICENCE")
    bac = next(level for level in form["levels"] if level["value"] == "BACCALAUREAT")
    assert (licence["needs_domain"], bac["needs_domain"]) == (True, False)
    certification = next(level for level in form["levels"] if level["value"] == "CERTIFICATION_PRO")
    assert (licence["on_scale"], certification["on_scale"]) == (True, False)
    assert form["domains"][-1]["value"] == "AUTRE"
    assert (form["max_mb"], form["limit"]) == (5, 20)
