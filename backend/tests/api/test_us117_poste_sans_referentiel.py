"""US-117 : sans référentiel importé, l'Agent RH crée un poste avec une unité en texte libre ; les employés aptes le voient."""

from tests.employees import EMP_A

OPENINGS = "/api/admin/openings"

FICHE = {
    "code": "cc-2026-01",
    "title": "Chargé de crédit",
    "unit_code": "Agence de Pétion-Ville",
    "target_grade": "10",
    "mission": "Instruire les demandes de crédit de l'agence.",
    "opens_on": "2026-10-01",
    "closes_on": "2026-11-15",
    "criteria": {},
}


def test_ca01_sans_referentiel_le_formulaire_ne_propose_aucune_unite(admin_client):
    form = admin_client.get(f"{OPENINGS}/form").json()
    assert form["units"] == []
    assert form["levels"] and form["domains"]


def test_ca01_ca03_le_poste_se_cree_et_affiche_l_unite_saisie(admin_client):
    response = admin_client.post(OPENINGS, json=FICHE)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["unit_code"] == "Agence de Pétion-Ville"
    assert body["unit_label"] == "Agence de Pétion-Ville"


def test_ca02_sans_unite_choisie_le_poste_publie_est_propose_a_tous_les_aptes(admin_client, employee_client):
    created = admin_client.post(OPENINGS, json=FICHE).json()
    assert admin_client.post(f"{OPENINGS}/{created['id']}/publish").status_code == 200
    [item] = employee_client(EMP_A).get("/api/me/openings").json()["items"]
    assert item["code"] == "CC-2026-01"
    assert item["unit_label"] == "Agence de Pétion-Ville"
