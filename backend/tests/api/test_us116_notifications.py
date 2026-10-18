"""US-116 : notifications de l'espace de gestion (dépôts, retards, signalements, candidatures)."""

from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.domain.admin import AdminAccount, AdminRole
from app.auth.domain.model import SubjectType
from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from app.dossier.domain.hr_information import Report, ReportOrigin
from app.job.domain.application import JobApplication
from app.job.domain.opening import Actor, JobOpening, OpeningFields
from tests.conftest import admin_session
from tests.employees import EMP_A, EMP_E

URL = "/api/admin/notifications"
MONDAY = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)


@pytest.fixture
def clock(frozen_clock):
    return frozen_clock(MONDAY)


@pytest.fixture
def rh_client(app, container):
    """Compte RH de test avec ce rôle et, s'il le faut, son propre matricule (RG-42)."""
    clients = []

    def create(role: AdminRole, username: str, employee_id: str | None = None) -> TestClient:
        account = AdminAccount(
            id=f"id-{username}", username=username, password_hash="non-utilise",
            created_at=datetime(2026, 10, 1, tzinfo=UTC), role=role, full_name=f"{username} (fictif)",
            employee_id=employee_id,
        )
        container.admin_accounts.add(account)
        token = container.session_service().open(SubjectType.ADMIN, account.id)
        client = TestClient(app, cookies={SESSION_COOKIE: token})
        clients.append(client)
        return client

    yield create
    for client in clients:
        client.close()


def deposit(container, employee, title="Licence en sciences comptables", status=CertificateStatus.RECEIVED, suffix="1"):
    certificate_id = f"cert-{employee.id}-{suffix}"
    container.certificates.add(
        Certificate(
            certificate_id, employee.id, "DIPLOME", "LICENCE", title, "Université fictive", 2019, None, "COMPTABILITE",
            None, status, container.clock.now(),
        ),
        CertificateFile(certificate_id, f"certs/{certificate_id}.pdf", "fictif.pdf", "application/pdf", 1024),
    )
    return certificate_id


def later(client, container, clock, **delta):
    """Avance l'horloge, puis rouvre la session RH (une session ne dure pas plusieurs jours)."""
    clock.advance(**delta)
    client.cookies.set(SESSION_COOKIE, admin_session(container))


def items(client, **params):
    response = client.get(URL, params=params)
    assert response.status_code == 200, response.text
    return response.json()


def kinds(body):
    return [item["kind"] for item in body["items"]]


# --- CA-02 : les quatre notifications ---------------------------------------------------------


def test_ca02_un_depot_de_certificat(admin_client, container, clock):
    certificate_id = deposit(container, EMP_A)
    body = items(admin_client)
    assert body["unread_count"] == 1
    assert body["items"] == [
        {
            "key": f"certificate:{certificate_id}",
            "kind": "CERTIFICATE_SUBMITTED",
            "kind_label": "Certificat",
            "title": "Jean JOSEPH a déposé un certificat",
            "detail": "Licence en sciences comptables",
            "at": "2026-10-05T09:00:00Z",
            "link": f"/admin/validation/{certificate_id}",
            "unread": True,
        }
    ]


def test_ca02_le_retard_une_seule_fois_apres_5_jours_ouvrables(admin_client, container, clock):
    certificate_id = deposit(container, EMP_A)
    later(admin_client, container, clock, days=7, hours=23)  # lundi 12, 08:00 : 5 jours ouvrables
    assert "CERTIFICATE_LATE" not in kinds(items(admin_client))

    later(admin_client, container, clock, days=1, hours=2)  # mardi 13, 10:00
    late = [item for item in items(admin_client)["items"] if item["kind"] == "CERTIFICATE_LATE"]
    assert late == [
        {
            "key": f"late:{certificate_id}",
            "kind": "CERTIFICATE_LATE",
            "kind_label": "Retard",
            "title": "Certificat en retard : plus de 5 jours ouvrables",
            "detail": "Jean JOSEPH · Licence en sciences comptables",
            "at": "2026-10-13T09:00:00Z",
            "link": f"/admin/validation/{certificate_id}",
            "unread": True,
        }
    ]
    later(admin_client, container, clock, days=10)
    assert kinds(items(admin_client)).count("CERTIFICATE_LATE") == 1


def test_ca02_un_certificat_traite_a_temps_n_est_pas_en_retard(admin_client, container, clock):
    deposit(container, EMP_A, status=CertificateStatus.VALIDATED)
    later(admin_client, container, clock, days=20)
    assert kinds(items(admin_client)) == ["CERTIFICATE_SUBMITTED"]


def test_ca02_un_signalement_de_l_employe(admin_client, container, clock):
    container.dossiers.add_report(
        Report(EMP_A.id, "hire_date_confirmed", ReportOrigin.EMPLOYEE, "03/09/2018", "03/09/2017", None, clock.now())
    )
    container.dossiers.add_report(
        Report(EMP_E.id, "hire_date_confirmed", ReportOrigin.AUTOMATIC, "20/10/2005", None, None, clock.now())
    )
    [item] = items(admin_client)["items"]
    assert (item["kind"], item["kind_label"], item["title"], item["detail"], item["link"]) == (
        "ERROR_REPORTED", "Signalement", "Jean JOSEPH signale une erreur", "Date d'embauche", "/admin/signalements",
    )


def test_ca02_une_candidature(admin_client, container, clock):
    actor = Actor("rh", "Agent RH (fictif)")
    opening = container.openings.add(
        JobOpening.create(
            OpeningFields("CC-2026-01", "Chargé de crédit", "AD", "12", "Mission.", date(2026, 10, 1), date(2026, 11, 15)),
            actor, clock.now(),
        )
    )
    container.applications.add(JobApplication.submit(opening.id, EMP_A.id, "", Actor(EMP_A.id, "Jean JOSEPH"), clock.now()))
    [item] = items(admin_client)["items"]
    assert (item["kind"], item["kind_label"], item["title"], item["detail"], item["link"]) == (
        "APPLICATION_RECEIVED", "Candidature", "Jean JOSEPH a postulé", "Chargé de crédit · CC-2026-01",
        f"/admin/postes/{opening.id}",
    )


def test_ca02_les_plus_recentes_d_abord_filtre_et_limite(admin_client, container, clock):
    deposit(container, EMP_A, title="Premier", suffix="1")
    clock.advance(minutes=10)
    deposit(container, EMP_E, title="Second", suffix="2")
    body = items(admin_client)
    assert [item["detail"] for item in body["items"]] == ["Second", "Premier"]
    assert items(admin_client, kind="ERROR_REPORTED")["items"] == []
    limited = items(admin_client, limit=1)
    assert (len(limited["items"]), limited["unread_count"], limited["has_more"]) == (1, 2, True)


# --- CA-03 : qui est prévenu ------------------------------------------------------------------


def test_ca03_jamais_pour_ses_propres_certificats(rh_client, container, clock):
    agent = rh_client(AdminRole.AGENT_RH, "agent.notifs", employee_id=EMP_A.id)
    deposit(container, EMP_A)
    deposit(container, EMP_E, title="Master en finance")
    assert [item["detail"] for item in items(agent)["items"]] == ["Master en finance"]


@pytest.mark.parametrize("role", [AdminRole.READONLY, AdminRole.REFERENTIAL])
def test_ca03_seuls_l_agent_rh_et_l_administrateur_sont_prevenus(rh_client, role):
    client = rh_client(role, f"compte.{role.value.lower()}")
    assert client.get(URL).status_code == 403
    assert client.post(f"{URL}/read-all").status_code == 403


# --- CA-04 : lu et non lu, par compte ---------------------------------------------------------


def test_ca04_lire_une_notification_ne_change_rien_pour_les_autres(admin_client, rh_client, container, clock):
    agent = rh_client(AdminRole.AGENT_RH, "agent.lecture")
    certificate_id = deposit(container, EMP_A)
    response = admin_client.post(f"{URL}/certificate:{certificate_id}/read")
    assert response.status_code == 204
    assert (items(admin_client)["unread_count"], items(admin_client)["items"][0]["unread"]) == (0, False)
    assert items(agent)["unread_count"] == 1


def test_ca04_tout_marquer_comme_lu(admin_client, container, clock):
    deposit(container, EMP_A, suffix="1")
    deposit(container, EMP_E, suffix="2")
    assert admin_client.post(f"{URL}/read-all").status_code == 204
    assert items(admin_client)["unread_count"] == 0
    clock.advance(minutes=5)
    deposit(container, EMP_A, suffix="3")
    assert items(admin_client)["unread_count"] == 1


# --- CA-05 : 90 jours -------------------------------------------------------------------------


def test_ca05_une_notification_disparait_apres_90_jours(admin_client, container, clock):
    certificate_id = deposit(container, EMP_A, status=CertificateStatus.VALIDATED)
    later(admin_client, container, clock, days=90)
    assert len(items(admin_client)["items"]) == 1
    later(admin_client, container, clock, minutes=1)
    assert items(admin_client)["items"] == []
    assert container.certificates.get(certificate_id) is not None  # le certificat, lui, reste
