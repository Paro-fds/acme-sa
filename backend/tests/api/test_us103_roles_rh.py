"""US-103 : Donner un rôle à chaque compte RH (EF-103, RG-41, D-15)."""

import pytest
from app.auth.domain.admin import AdminRole
from tests.conftest import rh_login
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A

ADMINS = "/api/admin/admins"
ROLES = "/api/admin/roles"
STATISTICS = "/api/admin/statistics"
EMPLOYEES = "/api/admin/employees"
MY_PASSWORD = "/api/admin/me/password"
PROVISIONAL = "Provisoire-2026!"
CHOSEN = "Definitif-2026!"


def _create_admin_with_role(admin_client, username, role="AGENT_RH", password=PROVISIONAL):
    res = admin_client.post(ADMINS, json={"username": username, "password": password, "role": role})
    assert res.status_code == 201
    return res.json()


def _login_and_activate(client, username, provisional=PROVISIONAL, chosen=CHOSEN):
    rh_login(client, username, provisional)
    res = client.post(
        MY_PASSWORD,
        json={"current_password": provisional, "new_password": chosen, "new_password_confirmation": chosen},
    )
    assert res.status_code == 204


# --- CA-01 : Consultation seule vs actions interdites pour READONLY -------------------


def test_ca01_readonly_can_consult_dashboards_and_employee_list(admin_client, client):
    # Créer un compte avec le rôle READONLY
    created = _create_admin_with_role(admin_client, username="lecteur.rh", role="READONLY")
    assert created["role"] == "READONLY"
    assert created["role_label"] == "Lecture seule"

    # Se connecter et activer le compte
    _login_and_activate(client, "lecteur.rh")

    # Consulter les statistiques et la liste des employés : 200 OK
    res_stats = client.get(STATISTICS)
    assert res_stats.status_code == 200

    res_emp = client.get(EMPLOYEES)
    assert res_emp.status_code == 200
    assert len(res_emp.json()["items"]) > 0


def test_ca01_readonly_is_forbidden_from_actions(admin_client, client):
    _create_admin_with_role(admin_client, username="lecteur.rh2", role="READONLY")
    _login_and_activate(client, "lecteur.rh2")

    # Tenter de réinitialiser l'accès d'un employé -> 403 Refusé
    res_reset = client.post("/api/admin/employees/1001/reset-access")
    assert res_reset.status_code == 403
    assert res_reset.json()["error"]["code"] == "INSUFFICIENT_ROLE"

    # Tenter d'importer le référentiel -> 403 Refusé
    res_import = client.post(
        "/api/admin/referential/import",
        files={"file": ("test.xlsx", b"dummy content", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert res_import.status_code == 403
    assert res_import.json()["error"]["code"] == "INSUFFICIENT_ROLE"

    # Tenter de créer un compte -> 403 Refusé
    res_add = client.post(ADMINS, json={"username": "pirate", "password": PROVISIONAL})
    assert res_add.status_code == 403
    assert res_add.json()["error"]["code"] == "INSUFFICIENT_ROLE"


# --- CA-02 : Un employé sans rôle RH n'accède jamais à l'espace RH --------------------


def test_ca02_employee_without_rh_role_never_accesses_rh_space(employee_client):
    emp = employee_client(EMP_A)
    assert emp.get(STATISTICS).status_code == 403
    assert emp.get(EMPLOYEES).status_code == 403
    assert emp.get(ADMINS).status_code == 403
    assert emp.post("/api/admin/employees/1001/reset-access").status_code == 403


# --- CA-03 : Changement de rôle tracé et contrôles ------------------------------------


def test_ca03_admin_can_change_role_and_it_is_traced(admin_client):
    # Créer un compte agent
    created = _create_admin_with_role(admin_client, username="agent.test", role="AGENT_RH")
    agent_id = created["id"]
    assert created["role"] == "AGENT_RH"

    # Passer l'agent en READONLY
    res_change = admin_client.put(f"{ADMINS}/{agent_id}/role", json={"role": "READONLY"})
    assert res_change.status_code == 200
    assert res_change.json()["role"] == "READONLY"
    assert res_change.json()["role_label"] == "Lecture seule"

    # Vérifier l'historique tracé
    res_history = admin_client.get(f"{ADMINS}/{agent_id}/role-history")
    assert res_history.status_code == 200
    history = res_history.json()
    assert len(history) == 1
    assert history[0]["admin_id"] == agent_id
    assert history[0]["old_role"] == "AGENT_RH"
    assert history[0]["new_role"] == "READONLY"
    assert history[0]["new_role_label"] == "Lecture seule"
    assert history[0]["at"] is not None

    # Changer à nouveau vers REFERENTIAL
    res_change2 = admin_client.put(f"{ADMINS}/{agent_id}/role", json={"role": "REFERENTIAL"})
    assert res_change2.status_code == 200
    assert res_change2.json()["role"] == "REFERENTIAL"

    # Vérifier que l'historique a maintenant 2 entrées
    res_history2 = admin_client.get(f"{ADMINS}/{agent_id}/role-history")
    history2 = res_history2.json()
    assert len(history2) == 2
    assert history2[0]["old_role"] == "READONLY"
    assert history2[0]["new_role"] == "REFERENTIAL"


def test_ca03_last_admin_cannot_be_demoted(admin_client, container):
    # Trouver le compte admin principal
    admins = admin_client.get(ADMINS).json()
    main_admin = next(a for a in admins if a["username"] == ADMIN_USERNAME)

    # Tenter de rétrograder le dernier admin en READONLY
    res = admin_client.put(f"{ADMINS}/{main_admin['id']}/role", json={"role": "READONLY"})
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "LAST_ADMIN"


def test_ca03_non_admin_cannot_change_roles(admin_client, client):
    # Créer un compte agent RH
    created = _create_admin_with_role(admin_client, username="agent.moderne", role="AGENT_RH")
    agent_id = created["id"]
    _login_and_activate(client, "agent.moderne")

    # L'agent tente de changer un rôle -> 403 Forbidden
    res = client.put(f"{ADMINS}/{agent_id}/role", json={"role": "ADMIN"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "INSUFFICIENT_ROLE"


def test_roles_list_endpoint(admin_client):
    res = admin_client.get(ROLES)
    assert res.status_code == 200
    roles = {item["value"]: item["label"] for item in res.json()}
    assert roles["ADMIN"] == "Administrateur"
    assert roles["AGENT_RH"] == "Agent RH"
    assert roles["REFERENTIAL"] == "Responsable du référentiel"
    assert roles["READONLY"] == "Lecture seule"
