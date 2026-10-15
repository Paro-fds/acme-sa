"""US-120 — Être prévenu dans le portail d'un poste ouvert pour moi et du sort de mes certificats.

Critères d'acceptation :
- CA-01 : le nombre de notifications non lues de l'employé connecté.
- CA-02 : « Nouveau poste ouvert pour vous » pour chaque poste publié et ouvert dont il remplit les critères, même s'il
  devient apte après la publication ; elle disparaît quand le poste n'est plus ouvert.
- CA-03 : « Certificat validé » et « Certificat à corriger » (avec le motif) à chaque décision des RH.
- CA-05 : lues et non lues par employé ; « Tout marquer comme lu ».
"""

from app.certificate.domain.certificate import CertificateStatus
from tests.api.test_us801_postes_eligibles import _certificate
from tests.employees import EMP_A, EMP_B

NOTIFICATIONS = "/api/me/notifications"
OPENINGS = "/api/admin/openings"

FICHE = {
    "code": "CPT-2026-01",
    "title": "Comptable fictif",
    "unit_code": "Direction Démo Comptable",
    "target_grade": "8",
    "mission": "Tenir les livres de l'institution fictive.",
    "opens_on": "2026-10-01",
    "closes_on": "2026-11-15",
    "criteria": {"domains": ["COMPTABILITE"], "min_level": "LICENCE"},
}


def _create(admin_client, **changes):
    created = admin_client.post(OPENINGS, json=FICHE | changes)
    assert created.status_code == 201, created.text
    return created.json()


def _publish(admin_client, **changes):
    opening = _create(admin_client, **changes)
    assert admin_client.post(f"{OPENINGS}/{opening['id']}/publish").status_code == 200
    return opening


def _notifications(client):
    response = client.get(NOTIFICATIONS)
    assert response.status_code == 200, response.text
    return response.json()


def test_ca02_l_employe_apte_est_prevenu_du_poste_publie(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")
    opening = _publish(admin_client)

    body = _notifications(employee_client(EMP_A))

    assert body["unread_count"] == 1
    [item] = body["items"]
    assert item["key"] == f"opening:{opening['id']}"
    assert item["kind"] == "OPENING"
    assert item["title"] == "Nouveau poste ouvert pour vous"
    assert item["detail"] == "Comptable fictif · Direction Démo Comptable · jusqu'au 15/11/2026"
    assert item["link"] == "/carriere"
    assert item["unread"] is True


def test_ca02_un_brouillon_ou_un_employe_non_apte_ne_donne_rien(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")
    _create(admin_client)  # brouillon
    _publish(admin_client, code="CPT-2026-02", criteria={"domains": ["INFORMATIQUE"]})

    assert _notifications(employee_client(EMP_A)) == {"items": [], "unread_count": 0, "has_more": False}


def test_ca02_l_employe_devenu_apte_apres_la_publication_est_prevenu(admin_client, employee_client, container):
    _publish(admin_client)
    client = employee_client(EMP_A)
    assert _notifications(client)["unread_count"] == 0

    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")

    assert [item["kind"] for item in _notifications(client)["items"]] == ["OPENING"]


def test_ca02_la_notification_disparait_quand_le_poste_est_cloture(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")
    opening = _publish(admin_client)
    client = employee_client(EMP_A)
    assert _notifications(client)["unread_count"] == 1

    assert admin_client.post(f"{OPENINGS}/{opening['id']}/close").status_code == 200

    assert _notifications(client)["items"] == []


def test_ca03_le_certificat_valide_ou_a_corriger_previent_l_employe(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE", status=CertificateStatus.RECEIVED, suffix="ok")
    _certificate(container, EMP_A.id, "MASTER", "FINANCE", status=CertificateStatus.RECEIVED, suffix="ko")
    validated = f"cert-{EMP_A.id}-ok"
    rejected = f"cert-{EMP_A.id}-ko"
    assert admin_client.post(f"/api/admin/validation/{validated}/decide", json={"decision": "VALIDATED"}).status_code == 200
    response = admin_client.post(
        f"/api/admin/validation/{rejected}/decide",
        json={"decision": "REJECTED", "reason": "Document illisible ou de mauvaise qualité", "comment": "Refaire la photo."},
    )
    assert response.status_code == 200, response.text

    items = {item["key"]: item for item in _notifications(employee_client(EMP_A))["items"]}

    ok = items[f"certificate:{validated}:VALIDATED"]
    assert ok["kind"] == "CERTIFICATE_VALIDATED"
    assert ok["title"] == "Certificat validé"
    assert ok["detail"] == "Diplôme fictif"
    assert ok["link"] == "/certificats"
    ko = items[f"certificate:{rejected}:TO_CORRECT"]
    assert ko["kind"] == "CERTIFICATE_TO_CORRECT"
    assert ko["title"] == "Certificat à corriger"
    assert ko["detail"] == "Diplôme fictif : Document illisible ou de mauvaise qualité"


def test_ca03_un_certificat_en_attente_ne_donne_rien(employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE", status=CertificateStatus.RECEIVED)
    assert _notifications(employee_client(EMP_A))["items"] == []


def test_ca05_une_notification_lue_l_est_pour_cet_employe_seulement(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")
    _certificate(container, EMP_B.id, "LICENCE", "COMPTABILITE")
    opening = _publish(admin_client)
    key = f"opening:{opening['id']}"
    a, b = employee_client(EMP_A), employee_client(EMP_B)

    assert a.post(f"{NOTIFICATIONS}/{key}/read").status_code == 204

    body = _notifications(a)
    assert body["unread_count"] == 0
    assert body["items"][0]["unread"] is False
    assert _notifications(b)["unread_count"] == 1


def test_ca05_tout_marquer_comme_lu(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")
    _publish(admin_client)
    _publish(admin_client, code="CPT-2026-02")
    client = employee_client(EMP_A)
    assert _notifications(client)["unread_count"] == 2

    assert client.post(f"{NOTIFICATIONS}/read-all").status_code == 204

    assert _notifications(client)["unread_count"] == 0


def test_ca05_les_lectures_d_un_employe_ne_touchent_pas_celles_des_rh(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "COMPTABILITE")
    _publish(admin_client)
    assert employee_client(EMP_A).post(f"{NOTIFICATIONS}/read-all").status_code == 204
    assert admin_client.get("/api/admin/notifications").status_code == 200


def test_sans_session_les_notifications_restent_fermees(client):
    assert client.get(NOTIFICATIONS).status_code == 401
    assert client.post(f"{NOTIFICATIONS}/read-all").status_code == 401
