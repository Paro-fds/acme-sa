"""US-902 (choix du 2026-10-11) : l'employé apte postule en ligne à un poste publié, reçoit un accusé de réception
immédiat et suit sa candidature ; les RH la font avancer depuis la fiche du poste ; rien n'est supprimé (RG-74)."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.domain.admin import AdminAccount, AdminRole
from app.auth.domain.model import SubjectType
from tests.employees import EMP_A, EMP_B
from tests.referential import workbook

OPENINGS = "/api/admin/openings"
MY_APPLICATIONS = "/api/me/applications"
COORDINATES_OK = {"telephone": "3712 3456", "address": "12 rue Capois, Port-au-Prince", "email": "", "no_email": True}
CONTACT_OK = {
    "contact_name": "Jean Baptiste Pierre",
    "contact_relationship": "SIBLING",
    "contact_telephone": "4812 8901",
    "education_level": "LICENCE",
}


@pytest.fixture(autouse=True)
def referential(admin_client):
    response = admin_client.post(
        "/api/admin/referential/import",
        files={"file": ("referentiel.xlsx", workbook(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200, response.text


@pytest.fixture
def opening(admin_client):
    created = admin_client.post(
        OPENINGS,
        json={
            "code": "CC-2026-01", "title": "Chargé de crédit", "unit_code": "AD", "target_grade": "12",
            "mission": "Mission fictive.", "opens_on": "2026-10-01", "closes_on": "2099-12-31",
            "criteria": {"min_years_in_institution": 3},
        },
    ).json()
    assert admin_client.post(f"{OPENINGS}/{created['id']}/publish").status_code == 200
    return created


@pytest.fixture
def jean(employee_client):
    """EMP-A, profil complet (D-23 : seul un profil complet dépose une demande)."""
    client = employee_client(EMP_A)
    client.post("/api/me/dossier/consent", json={"information_notice": True, "whatsapp": False})
    client.put("/api/me/dossier/coordinates", json=COORDINATES_OK)
    client.put("/api/me/dossier/contact-and-education", json=CONTACT_OK)
    for key in ("agency_confirmed", "position_confirmed", "hire_date_confirmed"):
        client.post(f"/api/me/dossier/hr-information/{key}/confirm")
    return client


@pytest.fixture
def agent_client(app, container):
    account = AdminAccount(
        id="id-agent", username="agent.candidatures", password_hash="x", created_at=datetime(2026, 10, 1, tzinfo=UTC),
        role=AdminRole.AGENT_RH, full_name="Agent RH Démo",
    )
    container.admin_accounts.add(account)
    token = container.session_service().open(SubjectType.ADMIN, account.id)
    with TestClient(app, cookies={SESSION_COOKIE: token}) as client:
        yield client


def _apply(client, opening, motivation="Je connais bien le crédit."):
    return client.post(f"/api/me/openings/{opening['id']}/apply", json={"motivation": motivation})


# --- Déposer ------------------------------------------------------------------------------


def test_ca01_l_employe_apte_postule_et_recoit_un_accuse_de_reception_immediat(jean, opening, clock):
    response = _apply(jean, opening)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["reference"].startswith("CAND-")
    assert body["opening_title"] == "Chargé de crédit"
    assert body["opening_code"] == "CC-2026-01"
    assert body["received_at"] == "2026-10-04T09:00:00Z"
    assert body["step"] == "RECEIVED"
    assert body["step_label"] == "Reçue et enregistrée"
    assert body["motivation"] == "Je connais bien le crédit."
    assert body["can_withdraw"] is True


def test_un_profil_incomplet_ne_postule_pas(employee_client, opening):
    response = _apply(employee_client(EMP_A), opening)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PROFILE_INCOMPLETE"


def test_un_employe_hors_criteres_ne_postule_pas(employee_client, opening):
    # EMP-B : embauché en 2024, le poste demande 3 ans d'ancienneté.
    response = _apply(employee_client(EMP_B), opening)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "NOT_ELIGIBLE"


def test_une_seule_candidature_en_cours_par_poste(jean, opening):
    _apply(jean, opening)
    response = _apply(jean, opening)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ALREADY_APPLIED"


def test_on_ne_postule_pas_a_un_poste_cloture(jean, opening, admin_client):
    admin_client.post(f"{OPENINGS}/{opening['id']}/close")
    response = _apply(jean, opening)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "OPENING_NOT_OPEN"


def test_la_motivation_est_limitee(jean, opening):
    response = _apply(jean, opening, motivation="x" * 2001)
    assert response.status_code == 422
    assert response.json()["error"]["field"] == "motivation"


# --- CA-02 : suivre -----------------------------------------------------------------------


def test_ca02_mes_candidatures_montrent_l_etape_en_cours(jean, opening, agent_client, clock):
    application = _apply(jean, opening).json()
    clock.advance(minutes=5)
    moved = agent_client.post(f"/api/admin/applications/{application['id']}/step", json={"step": "DRH_REVIEW"})
    assert moved.status_code == 200, moved.text

    [item] = jean.get(MY_APPLICATIONS).json()["items"]
    assert item["step"] == "DRH_REVIEW"
    assert item["step_label"] == "Étude par la DRH"
    assert [(h["step_label"], h["at"]) for h in item["history"]] == [
        ("Reçue et enregistrée", "2026-10-04T09:00:00Z"),
        ("Étude par la DRH", "2026-10-04T09:05:00Z"),
    ]


def test_ca02_les_rh_voient_les_candidatures_sur_la_fiche_du_poste(jean, opening, agent_client):
    _apply(jean, opening)
    [item] = agent_client.get(f"{OPENINGS}/{opening['id']}/applications").json()["items"]
    assert item["employee_code"] == "AC-1001"
    assert item["employee_name"] == "Jean JOSEPH"
    assert item["motivation"] == "Je connais bien le crédit."
    assert item["step_label"] == "Reçue et enregistrée"
    assert [step["code"] for step in item["next_steps"]] == [
        "DRH_REVIEW", "MANAGER", "EVALUATION", "DRH_DECISION", "DG_APPROVAL",
    ]


def test_ca02_les_rh_cloturent_avec_une_suite_que_l_employe_voit(jean, opening, agent_client):
    application = _apply(jean, opening).json()
    closed = agent_client.post(f"/api/admin/applications/{application['id']}/close", json={"outcome": "POSTPONED"})
    assert closed.status_code == 200, closed.text
    [item] = jean.get(MY_APPLICATIONS).json()["items"]
    assert (item["step_label"], item["outcome_label"], item["can_withdraw"]) == ("Clôturée", "Reportée", False)


def test_un_compte_lecture_seule_ne_fait_pas_avancer_une_candidature(jean, opening, app, container):
    application = _apply(jean, opening).json()
    account = AdminAccount(
        id="id-lecteur", username="lecteur.c", password_hash="x", created_at=datetime(2026, 10, 1, tzinfo=UTC),
        role=AdminRole.READONLY,
    )
    container.admin_accounts.add(account)
    token = container.session_service().open(SubjectType.ADMIN, account.id)
    with TestClient(app, cookies={SESSION_COOKIE: token}) as reader:
        response = reader.post(f"/api/admin/applications/{application['id']}/step", json={"step": "DRH_REVIEW"})
    assert response.status_code == 403


def test_l_employe_retire_sa_candidature_qui_reste_dans_l_historique(jean, opening, agent_client):
    application = _apply(jean, opening).json()
    withdrawn = jean.post(f"{MY_APPLICATIONS}/{application['id']}/withdraw")
    assert withdrawn.status_code == 200, withdrawn.text
    assert withdrawn.json()["outcome_label"] == "Retirée"
    # RG-74 : jamais supprimée ; les RH la voient toujours.
    [item] = agent_client.get(f"{OPENINGS}/{opening['id']}/applications").json()["items"]
    assert item["outcome_label"] == "Retirée"
    # Après un retrait, l'employé peut postuler de nouveau.
    assert _apply(jean, opening).status_code == 201


def test_un_employe_ne_retire_pas_la_candidature_d_un_autre(jean, opening, employee_client):
    application = _apply(jean, opening).json()
    response = employee_client(EMP_B).post(f"{MY_APPLICATIONS}/{application['id']}/withdraw")
    assert response.status_code == 404


def test_chaque_etape_rh_est_inscrite_au_journal_d_audit(jean, opening, agent_client, admin_client):
    application = _apply(jean, opening).json()
    agent_client.post(f"/api/admin/applications/{application['id']}/step", json={"step": "DRH_REVIEW"})
    agent_client.post(f"/api/admin/applications/{application['id']}/close", json={"outcome": "REFUSED"})
    entries = admin_client.get("/api/admin/audit", params={"action": "JOB_APPLICATION"}).json()["items"]
    assert [entry["details"] for entry in entries] == [
        f"Candidature {application['reference']} au poste CC-2026-01 : Clôturée (Refusée)",
        f"Candidature {application['reference']} au poste CC-2026-01 : Étude par la DRH",
    ]


# --- CV et profil au moment de la candidature (fiche de demande, Q6 §4) --------------------

CV_UPLOADS = "/api/me/applications/cv-uploads"
PDF = b"%PDF-1.7\n" + b"0" * 2000


def _upload_cv(client, content=PDF, content_type="application/pdf"):
    ticket = client.post(CV_UPLOADS, json={"content_type": content_type, "size_bytes": len(content)})
    assert ticket.status_code == 200, ticket.text
    ticket = ticket.json()
    assert client.put(ticket["url"], content=content, headers=ticket["headers"]).status_code == 204
    return ticket["upload_id"]


def _apply_with_cv(client, opening, upload_id, name="cv-jean.pdf"):
    return client.post(
        f"/api/me/openings/{opening['id']}/apply",
        json={"motivation": "", "cv_upload_id": upload_id, "cv_name": name},
    )


def test_le_cv_joint_est_garde_et_l_employe_le_voit(jean, opening):
    response = _apply_with_cv(jean, opening, _upload_cv(jean))
    assert response.status_code == 201, response.text
    assert response.json()["cv"] == {"name": "cv-jean.pdf", "content_type": "application/pdf", "size_bytes": len(PDF)}


def test_le_cv_est_facultatif(jean, opening):
    assert _apply(jean, opening).json()["cv"] is None


def test_un_cv_qui_n_est_ni_pdf_ni_image_est_refuse(jean, opening):
    response = jean.post(CV_UPLOADS, json={"content_type": "application/msword", "size_bytes": 100})
    assert response.status_code == 422
    fake = _upload_cv(jean, content=b"MZ" + b"0" * 100, content_type="application/pdf")
    response = _apply_with_cv(jean, opening, fake)
    assert response.status_code == 422


def test_les_rh_ouvrent_le_cv_et_la_consultation_est_tracee(jean, opening, agent_client, admin_client):
    application = _apply_with_cv(jean, opening, _upload_cv(jean)).json()
    [item] = agent_client.get(f"{OPENINGS}/{opening['id']}/applications").json()["items"]
    assert item["cv"]["name"] == "cv-jean.pdf"
    response = admin_client.get(f"/api/admin/applications/{application['id']}/cv")
    assert response.status_code == 200
    assert response.content == PDF
    assert response.headers["content-type"] == "application/pdf"
    entries = admin_client.get("/api/admin/audit", params={"action": "DOCUMENT_VIEW"}).json()["items"]
    assert entries[0]["details"] == f"Consultation du CV de la candidature {application['reference']}"


def test_le_cv_d_une_candidature_sans_cv(jean, opening, admin_client):
    application = _apply(jean, opening).json()
    assert admin_client.get(f"/api/admin/applications/{application['id']}/cv").status_code == 404


def test_le_profil_au_moment_de_la_candidature_est_fige(jean, opening, agent_client, container, clock):
    from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus

    container.certificates.add(
        Certificate(
            "cert-902", EMP_A.id, "DIPLOME", "LICENCE", "Licence en finance", "Université fictive", 2015, None,
            "FINANCE", None, CertificateStatus.VALIDATED, clock.now(),
        ),
        CertificateFile("cert-902", "certs/cert-902.pdf", "fictif.pdf", "application/pdf", 1024),
    )
    _apply(jean, opening)
    # Un certificat validé après la candidature ne change pas le profil gardé.
    container.certificates.add(
        Certificate(
            "cert-902b", EMP_A.id, "DIPLOME", "MASTER", "Master fictif", "Université fictive", 2020, None,
            "FINANCE", None, CertificateStatus.VALIDATED, clock.now(),
        ),
        CertificateFile("cert-902b", "certs/cert-902b.pdf", "fictif.pdf", "application/pdf", 1024),
    )
    [item] = agent_client.get(f"{OPENINGS}/{opening['id']}/applications").json()["items"]
    assert item["profile_snapshot"] == [
        "Poste : Agent de crédit",
        "Grade : 12",
        "Unités : Pétion-Ville, Métropole 1, Direction du Crédit",
        "Ancienneté dans l'institution : 8 ans (embauche le 03/09/2018)",
        "Niveau d'études validé : Licence",
        "Certificats validés : Licence en finance (Licence, Finance, 2015)",
    ]
