"""US-119 — Publier un poste à partir du catalogue des postes ACME (postes fictifs : fixtures/job_profiles_test.json).

US-121 : le catalogue vient de la matrice du directeur (codes de la matrice) et le département remplace le domaine.

Critères d'acceptation :
- CA-01 : le catalogue liste toutes les fiches, avec leur département et le niveau demandé.
- CA-02 : chaque fiche s'ouvre avec ses rubriques.
- CA-03 : la fiche propose l'intitulé, la mission, les domaines de diplôme et le niveau minimum du poste à publier.
- CA-04 : le poste publié depuis une fiche suit le circuit habituel et garde le lien vers sa fiche.
- CA-05 : l'employé qui voit le poste lit la fiche complète.
- CA-06 : un poste saisi hors catalogue fonctionne comme avant.
"""

from app.auth.domain.admin import AdminRole
from tests.api.test_us801_postes_eligibles import _certificate
from tests.api.test_us802_postes import _rh_client
from tests.employees import EMP_A

PROFILES = "/api/admin/job-profiles"
OPENINGS = "/api/admin/openings"

FICHE = {
    "code": "CPT-2026-01",
    "title": "Comptable fictif",
    "unit_code": "Direction Démo Comptable",
    "target_grade": "8",
    "mission": "Le comptable fictif tient les livres de l'institution fictive.",
    "opens_on": "2026-10-01",
    "closes_on": "2026-11-15",
    "criteria": {"domains": ["FINANCE", "COMPTABILITE", "ECONOMIE"], "min_level": "MASTER"},
    "profile_code": "CF02",
}


def test_ca01_le_catalogue_liste_toutes_les_fiches_par_ordre_alphabetique(admin_client):
    response = admin_client.get(PROFILES)
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert [item["code"] for item in items] == ["AF01", "charge-de-mission-fictif", "CF02"]
    assert items[0] == {
        "code": "AF01",
        "position_code": "AF01",
        "title": "Agent fictif de crédit",
        "department": "Crédit",
        "service": "Réseau d'agences fictif",
        "level_text": "Bac + 4",
    }
    assert items[1]["level_text"] is None


def test_ca01_un_compte_en_lecture_seule_consulte_le_catalogue(app, container):
    with _rh_client(app, container, AdminRole.READONLY, "lecteur.catalogue") as client:
        assert client.get(PROFILES).status_code == 200
        assert client.get(f"{PROFILES}/CF02").status_code == 200


def test_ca02_ca03_la_fiche_s_ouvre_avec_ses_rubriques_et_ses_propositions(admin_client):
    response = admin_client.get(f"{PROFILES}/CF02")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["title"] == "Comptable fictif"
    assert body["description"] == "Le comptable fictif tient les livres de l'institution fictive."
    assert body["sections"] == [
        {"title": "Missions", "lines": ["Concilier les comptes fictifs"]},
        {"title": "Qualités attendues", "lines": ["Être rigoureux"]},
    ]
    assert body["suggested_domains"] == ["FINANCE", "COMPTABILITE", "ECONOMIE"]
    assert body["suggested_level"] == "MASTER"


def test_ca03_une_fiche_sans_domaine_de_diplome_ni_niveau_ne_propose_rien(admin_client):
    body = admin_client.get(f"{PROFILES}/charge-de-mission-fictif").json()
    assert body["suggested_domains"] == []
    assert body["suggested_level"] is None


def test_ca02_une_fiche_inconnue_est_introuvable(admin_client):
    response = admin_client.get(f"{PROFILES}/inconnue")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "JOB_PROFILE_NOT_FOUND"


def test_ca04_le_poste_publie_depuis_une_fiche_garde_le_lien_vers_elle(admin_client):
    response = admin_client.post(OPENINGS, json=FICHE)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "DRAFT"
    assert body["profile_code"] == "CF02"
    assert body["profile_title"] == "Comptable fictif"
    assert admin_client.get(f"{OPENINGS}/{body['id']}").json()["profile_code"] == "CF02"


def test_ca04_une_fiche_inconnue_est_refusee_a_la_saisie(admin_client):
    response = admin_client.post(OPENINGS, json=FICHE | {"profile_code": "inconnue"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["field"] == "profile_code"


def test_ca05_l_employe_apte_lit_la_fiche_complete(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "MASTER", "COMPTABILITE")
    created = admin_client.post(OPENINGS, json=FICHE).json()
    assert admin_client.post(f"{OPENINGS}/{created['id']}/publish").status_code == 200

    [item] = employee_client(EMP_A).get("/api/me/openings").json()["items"]

    assert item["profile_department"] == "Finance"
    assert item["sections"] == [
        {"title": "Missions", "lines": ["Concilier les comptes fictifs"]},
        {"title": "Qualités attendues", "lines": ["Être rigoureux"]},
    ]


def test_ca06_un_poste_hors_catalogue_fonctionne_comme_avant(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "MASTER", "COMPTABILITE")
    fiche = {key: value for key, value in FICHE.items() if key != "profile_code"}
    created = admin_client.post(OPENINGS, json=fiche)
    assert created.status_code == 201, created.text
    assert created.json()["profile_code"] is None
    assert admin_client.post(f"{OPENINGS}/{created.json()['id']}/publish").status_code == 200

    [item] = employee_client(EMP_A).get("/api/me/openings").json()["items"]
    assert item["sections"] == []
    assert item["profile_department"] is None
