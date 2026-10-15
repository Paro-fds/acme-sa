"""US-121 — Publier un poste à partir de la matrice des postes du directeur (postes fictifs : fixtures/job_profiles_test.json).

Critères d'acceptation :
- CA-01 : chaque poste montre son code (vide s'il n'en a pas), son intitulé, son département, son service, ses compétences.
- CA-02 : le département propose les domaines de diplôme.
- CA-03 : la description de même intitulé ajoute ses rubriques et son niveau ; sinon « Non précisé ».
- CA-05 : l'employé qui voit le poste lit son département et ses compétences.
- CA-06 : un poste publié à partir d'une ancienne fiche reste affiché tel qu'il a été saisi.
"""

from app.job.domain.opening import JobOpening
from tests.api.test_us801_postes_eligibles import _certificate
from tests.employees import EMP_A

PROFILES = "/api/admin/job-profiles"
OPENINGS = "/api/admin/openings"

FICHE = {
    "code": "CF02",
    "title": "Comptable fictif",
    "unit_code": "Direction Démo Comptable",
    "target_grade": "8",
    "mission": "Le comptable fictif tient les livres de l'institution fictive.",
    "opens_on": "2026-10-01",
    "closes_on": "2026-11-15",
    "criteria": {"domains": ["FINANCE"], "min_level": "MASTER"},
    "profile_code": "CF02",
}


def test_ca01_ca02_le_poste_montre_son_code_son_departement_et_ses_competences(admin_client):
    body = admin_client.get(f"{PROFILES}/CF02").json()
    assert body["position_code"] == "CF02"
    assert body["department"] == "Finance"
    assert body["service"] == "Comptabilité"
    assert body["competences"] == ["Respect des normes comptables", "Clôture mensuelle fictive"]
    assert body["suggested_domains"] == ["FINANCE", "COMPTABILITE", "ECONOMIE"]


def test_ca01_ca03_un_poste_sans_code_ni_description(admin_client):
    body = admin_client.get(f"{PROFILES}/charge-de-mission-fictif").json()
    assert body["position_code"] == ""
    assert body["department"] == "Direction générale"
    assert body["competences"] == ["Suivi des projets fictifs"]
    assert body["sections"] == []
    assert body["level_text"] is None
    assert body["suggested_domains"] == []


def test_ca05_l_employe_apte_lit_le_departement_et_les_competences(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "MASTER", "FINANCE")
    created = admin_client.post(OPENINGS, json=FICHE).json()
    assert admin_client.post(f"{OPENINGS}/{created['id']}/publish").status_code == 200

    [item] = employee_client(EMP_A).get("/api/me/openings").json()["items"]

    assert item["profile_department"] == "Finance"
    assert item["competences"] == ["Respect des normes comptables", "Clôture mensuelle fictive"]
    assert item["sections"][0] == {"title": "Missions", "lines": ["Concilier les comptes fictifs"]}


def test_ca06_un_poste_issu_d_une_ancienne_fiche_reste_affiche(admin_client, employee_client, container):
    """Une fiche retirée du catalogue (ancienne source US-119) : le poste garde ce qui a été saisi, sans rubriques."""
    _certificate(container, EMP_A.id, "MASTER", "FINANCE")
    fiche = {key: value for key, value in FICHE.items() if key != "profile_code"}
    created = admin_client.post(OPENINGS, json=fiche).json()
    opening: JobOpening = container.openings.get(created["id"])
    opening.profile_code = "ancienne-fiche-retiree"
    container.openings.save(opening)
    assert admin_client.post(f"{OPENINGS}/{created['id']}/publish").status_code == 200

    detail = admin_client.get(f"{OPENINGS}/{created['id']}").json()
    assert detail["profile_title"] is None
    [item] = employee_client(EMP_A).get("/api/me/openings").json()["items"]
    assert item["title"] == "Comptable fictif"
    assert item["profile_department"] is None
    assert item["competences"] == []
    assert item["sections"] == []

