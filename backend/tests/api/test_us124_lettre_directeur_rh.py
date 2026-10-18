"""US-124 : l'Agent RH publie un poste en joignant la lettre du directeur RH ; l'Administrateur publie sans lettre
et peut ouvrir la lettre à tout moment (consultation tracée)."""

import pytest

from tests.api.test_us802_postes import FICHE, OPENINGS, _create, agent_client, readonly_client, referential  # noqa: F401

LETTER_UPLOADS = "/api/admin/openings/letter-uploads"
PDF = b"%PDF-1.7\n" + b"0" * 2000


def _upload_letter(client, content=PDF, content_type="application/pdf") -> str:
    ticket = client.post(LETTER_UPLOADS, json={"content_type": content_type, "size_bytes": len(content)})
    assert ticket.status_code == 200, ticket.text
    ticket = ticket.json()
    assert client.put(ticket["url"], content=content, headers=ticket["headers"]).status_code == 204
    return ticket["upload_id"]


def _publish(client, opening, upload_id=None, name="lettre-drh.pdf"):
    body = {"letter_upload_id": upload_id, "letter_name": name} if upload_id else None
    return client.post(f"{OPENINGS}/{opening['id']}/publish", json=body)


# --- CA-01 : l'Agent RH publie avec la lettre ----------------------------------------------


def test_ca01_sans_lettre_l_agent_rh_ne_publie_pas(agent_client):
    opening = _create(agent_client)
    response = _publish(agent_client, opening)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "HR_LETTER_REQUIRED"
    assert error["field"] == "letter"
    assert agent_client.get(f"{OPENINGS}/{opening['id']}").json()["status"] == "DRAFT"


def test_ca01_avec_la_lettre_l_agent_rh_publie(agent_client, clock):
    opening = _create(agent_client)
    clock.advance(minutes=10)
    response = _publish(agent_client, opening, _upload_letter(agent_client))
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "PUBLISHED"
    assert body["letter"]["name"] == "lettre-drh.pdf"
    assert body["letter"]["content_type"] == "application/pdf"
    assert body["letter"]["size_bytes"] == len(PDF)
    assert body["letter"]["actor_name"] == "agent.postes (fictif)"
    assert body["letter"]["at"].startswith("2026-10-04T09:10")


def test_ca01_un_poste_du_catalogue_demande_aussi_la_lettre(agent_client):
    code = agent_client.get("/api/admin/job-profiles").json()["items"][0]["code"]
    opening = _create(agent_client, profile_code=code)
    assert _publish(agent_client, opening).json()["error"]["code"] == "HR_LETTER_REQUIRED"


def test_ca01_une_lettre_qui_n_est_ni_pdf_ni_image_est_refusee(agent_client):
    response = agent_client.post(LETTER_UPLOADS, json={"content_type": "application/msword", "size_bytes": 100})
    assert response.status_code == 422
    opening = _create(agent_client)
    fake = _upload_letter(agent_client, content=b"MZ" + b"0" * 100)
    assert _publish(agent_client, opening, fake).status_code == 422
    assert agent_client.get(f"{OPENINGS}/{opening['id']}").json()["status"] == "DRAFT"


def test_ca01_une_lettre_inconnue_est_refusee(agent_client):
    opening = _create(agent_client)
    response = _publish(agent_client, opening, "0" * 32)
    assert response.status_code in (404, 422)
    assert agent_client.get(f"{OPENINGS}/{opening['id']}").json()["status"] == "DRAFT"


def test_ca01_un_compte_lecture_seule_ne_publie_pas(agent_client, readonly_client):
    opening = _create(agent_client)
    assert readonly_client.post(LETTER_UPLOADS, json={"content_type": "application/pdf", "size_bytes": 10}).status_code == 403
    assert _publish(readonly_client, opening).status_code == 403


# --- CA-02 : l'Administrateur publie sans lettre ; clôture et pourvu restent à lui ---------


def test_ca02_l_administrateur_publie_sans_lettre(agent_client, admin_client):
    opening = _create(agent_client)
    response = _publish(admin_client, opening)
    assert response.status_code == 200, response.text
    assert response.json()["letter"] is None


@pytest.mark.parametrize("action", ["close", "fill"])
def test_ca02_l_agent_rh_ne_cloture_pas_et_ne_pourvoit_pas(agent_client, action):
    opening = _create(agent_client)
    _publish(agent_client, opening, _upload_letter(agent_client))
    assert agent_client.post(f"{OPENINGS}/{opening['id']}/{action}").status_code == 403


# --- CA-03 : le directeur RH (compte Administrateur) ouvre la lettre ; c'est tracé ---------


def test_ca03_l_administrateur_ouvre_la_lettre_et_c_est_trace(agent_client, admin_client):
    opening = _create(agent_client)
    _publish(agent_client, opening, _upload_letter(agent_client))
    assert admin_client.get(f"{OPENINGS}/{opening['id']}").json()["letter"]["name"] == "lettre-drh.pdf"
    response = admin_client.get(f"{OPENINGS}/{opening['id']}/letter")
    assert response.status_code == 200
    assert response.content == PDF
    assert response.headers["content-type"] == "application/pdf"
    entries = admin_client.get("/api/admin/audit", params={"action": "JOB_OPENING"}).json()["items"]
    assert entries[0]["details"] == "Consultation de la lettre du directeur RH du poste CC-2026-01"


def test_ca03_un_poste_sans_lettre(agent_client, admin_client):
    opening = _create(agent_client)
    _publish(admin_client, opening)
    assert admin_client.get(f"{OPENINGS}/{opening['id']}/letter").status_code == 404


# --- CA-04 : la lettre ne change plus après la publication ---------------------------------


def test_ca04_la_lettre_ne_change_plus(agent_client):
    opening = _create(agent_client)
    _publish(agent_client, opening, _upload_letter(agent_client))
    response = _publish(agent_client, opening, _upload_letter(agent_client), name="autre.pdf")
    assert response.status_code == 409
    assert agent_client.get(f"{OPENINGS}/{opening['id']}").json()["letter"]["name"] == "lettre-drh.pdf"


def test_ca04_modifier_la_fiche_garde_la_lettre(agent_client):
    opening = _create(agent_client)
    _publish(agent_client, opening, _upload_letter(agent_client))
    response = agent_client.put(f"{OPENINGS}/{opening['id']}", json={**FICHE, "mission": "Nouvelle mission."})
    assert response.status_code == 200, response.text
    assert response.json()["letter"]["name"] == "lettre-drh.pdf"
