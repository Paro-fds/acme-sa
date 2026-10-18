"""US-802 : Publier un poste (EF-803, EF-804). L'Agent RH saisit, l'Administrateur publie, clôture, pourvoit."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.domain.admin import AdminAccount, AdminRole
from app.auth.domain.model import SubjectType
from tests.employees import EMP_A
from tests.referential import workbook

OPENINGS = "/api/admin/openings"
FORM = "/api/admin/openings/form"

FICHE = {
    "code": "cc-2026-01",
    "title": "Chargé de crédit",
    "unit_code": "AD",
    "target_grade": "10",
    "mission": "Instruire les demandes de crédit de l'agence.",
    "opens_on": "2026-10-15",
    "closes_on": "2026-11-15",
    "criteria": {"min_level": "LICENCE", "domains": ["FINANCE"], "min_years_in_institution": 2},
}


@pytest.fixture(autouse=True)
def referential(admin_client):
    """Les unités viennent du référentiel officiel (US-501)."""
    response = admin_client.post(
        "/api/admin/referential/import",
        files={"file": ("referentiel.xlsx", workbook(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200, response.text


def _rh_client(app, container, role: AdminRole, username: str) -> TestClient:
    account = AdminAccount(
        id=f"id-{username}",
        username=username,
        password_hash="non-utilise",
        created_at=datetime(2026, 10, 1, tzinfo=UTC),
        role=role,
        full_name=f"{username} (fictif)",
    )
    container.admin_accounts.add(account)
    token = container.session_service().open(SubjectType.ADMIN, account.id)
    return TestClient(app, cookies={SESSION_COOKIE: token})


@pytest.fixture
def agent_client(app, container):
    with _rh_client(app, container, AdminRole.AGENT_RH, "agent.postes") as client:
        yield client


@pytest.fixture
def readonly_client(app, container):
    with _rh_client(app, container, AdminRole.READONLY, "lecteur.postes") as client:
        yield client


def _create(client, **changes) -> dict:
    response = client.post(OPENINGS, json={**FICHE, **changes})
    assert response.status_code == 201, response.text
    return response.json()


# --- CA-01 : la fiche ---------------------------------------------------------------------


def test_ca01_le_formulaire_propose_les_unites_niveaux_et_domaines(agent_client):
    form = agent_client.get(FORM).json()
    assert {"code": "AD", "label": "Agence Démo", "type_label": "Agence"} in form["units"]
    assert {"code": "LICENCE", "label": "Licence"} in form["levels"]
    assert all(level["code"] not in ("CERTIFICATION_PRO", "FORMATION_CONTINUE") for level in form["levels"])
    assert {"code": "FINANCE", "label": "Finance"} in form["domains"]


def test_ca01_l_agent_rh_saisit_une_fiche_complete(agent_client, clock):
    created = _create(agent_client)
    assert created["code"] == "CC-2026-01"
    assert created["title"] == "Chargé de crédit"
    assert created["unit_code"] == "AD"
    assert created["unit_label"] == "Agence Démo"
    assert created["target_grade"] == "10"
    assert created["mission"] == "Instruire les demandes de crédit de l'agence."
    assert created["opens_on"] == "2026-10-15"
    assert created["closes_on"] == "2026-11-15"
    assert created["criteria"]["min_level"] == "LICENCE"
    assert created["criteria_lines"] == [
        "Niveau d'études minimum : Licence",
        "Domaine : Finance",
        "Ancienneté dans l'institution : 2 ans au moins",
    ]
    assert agent_client.get(f"{OPENINGS}/{created['id']}").json() == created


def test_ca01_une_fiche_incomplete_est_refusee_pres_du_champ(agent_client):
    response = agent_client.post(OPENINGS, json={**FICHE, "closes_on": "2026-10-01"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_OPENING_FIELD"
    assert response.json()["error"]["field"] == "closes_on"


def test_ca01_deux_postes_ne_partagent_jamais_un_code(agent_client):
    _create(agent_client)
    response = agent_client.post(OPENINGS, json={**FICHE, "code": "CC-2026-01"})
    assert response.status_code == 409
    assert response.json()["error"]["field"] == "code"


def test_ca01_la_liste_montre_chaque_poste_et_son_statut(agent_client, readonly_client):
    _create(agent_client)
    _create(agent_client, code="AG-2026-02", title="Agent de guichet")
    items = readonly_client.get(OPENINGS).json()["items"]
    assert [(i["code"], i["status"], i["status_label"]) for i in items] == [
        ("AG-2026-02", "DRAFT", "Brouillon"),
        ("CC-2026-01", "DRAFT", "Brouillon"),
    ]
    assert items[0]["unit_label"] == "Agence Démo"


def test_ca01_un_compte_lecture_seule_ne_saisit_pas_de_poste(readonly_client):
    response = readonly_client.post(OPENINGS, json=FICHE)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "INSUFFICIENT_ROLE"


def test_ca01_un_employe_n_accede_pas_aux_postes_rh(employee_client):
    assert employee_client(EMP_A).get(OPENINGS).status_code == 403


# --- CA-02 : statuts avec date et auteur ; trace des critères ----------------------------


def test_ca02_l_administrateur_publie_apres_l_agent_rh(agent_client, admin_client, clock):
    created = _create(agent_client)
    clock.advance(minutes=10)
    published = admin_client.post(f"{OPENINGS}/{created['id']}/publish")
    assert published.status_code == 200, published.text
    body = published.json()
    assert body["status"] == "PUBLISHED"
    assert body["status_label"] == "Publié"
    assert [(h["status_label"], h["actor_name"]) for h in body["history"]] == [
        ("Brouillon", "agent.postes (fictif)"),
        ("Publié", body["history"][1]["actor_name"]),
    ]
    assert body["history"][0]["at"].startswith("2026-10-04T09:00")
    assert body["history"][1]["at"].startswith("2026-10-04T09:10")


@pytest.mark.parametrize("action", ["close", "fill"])
def test_ca02_seul_l_administrateur_change_le_statut(agent_client, action):
    """US-124 : l'Agent RH publie avec la lettre du directeur RH ; clôturer et pourvoir restent à l'Administrateur."""
    created = _create(agent_client)
    response = agent_client.post(f"{OPENINGS}/{created['id']}/{action}")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "INSUFFICIENT_ROLE"


def test_ca02_cloturer_puis_pourvoir(agent_client, admin_client):
    created = _create(agent_client)
    admin_client.post(f"{OPENINGS}/{created['id']}/publish")
    assert admin_client.post(f"{OPENINGS}/{created['id']}/close").json()["status_label"] == "Clôturé"
    filled = admin_client.post(f"{OPENINGS}/{created['id']}/fill").json()
    assert filled["status_label"] == "Pourvu"
    assert [h["status"] for h in filled["history"]] == ["DRAFT", "PUBLISHED", "CLOSED", "FILLED"]


def test_ca02_un_changement_impossible_est_refuse(agent_client, admin_client):
    created = _create(agent_client)
    response = admin_client.post(f"{OPENINGS}/{created['id']}/close")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "OPENING_TRANSITION_REFUSED"


def test_ca02_un_critere_modifie_apres_publication_est_trace(agent_client, admin_client, clock):
    created = _create(agent_client)
    admin_client.post(f"{OPENINGS}/{created['id']}/publish")
    clock.advance(minutes=5)
    response = agent_client.put(
        f"{OPENINGS}/{created['id']}", json={**FICHE, "criteria": {"min_level": "MASTER", "domains": ["FINANCE"]}}
    )
    assert response.status_code == 200, response.text
    [change] = response.json()["criteria_changes"]
    assert change["actor_name"] == "agent.postes (fictif)"
    assert change["at"].startswith("2026-10-04T09:05")
    assert change["before"][0] == "Niveau d'études minimum : Licence"
    assert change["after"] == ["Niveau d'études minimum : Master", "Domaine : Finance"]


def test_ca02_un_poste_pourvu_ne_se_modifie_plus(agent_client, admin_client):
    created = _create(agent_client)
    admin_client.post(f"{OPENINGS}/{created['id']}/publish")
    admin_client.post(f"{OPENINGS}/{created['id']}/fill")
    response = agent_client.put(f"{OPENINGS}/{created['id']}", json=FICHE)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "OPENING_LOCKED"


def test_ca02_chaque_etape_est_inscrite_au_journal_d_audit(agent_client, admin_client):
    created = _create(agent_client)
    admin_client.post(f"{OPENINGS}/{created['id']}/publish")
    agent_client.put(f"{OPENINGS}/{created['id']}", json={**FICHE, "criteria": {}})
    entries = admin_client.get("/api/admin/audit", params={"action": "JOB_OPENING"}).json()["items"]
    assert [entry["details"] for entry in entries] == [
        "Critères du poste CC-2026-01 modifiés après publication",
        "Poste CC-2026-01 : Publié",
        "Poste CC-2026-01 : Brouillon",
    ]
    assert entries[-1]["target_id"] == "CC-2026-01"


def test_un_poste_inconnu(admin_client):
    response = admin_client.get(f"{OPENINGS}/9999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "OPENING_NOT_FOUND"
