"""US-104 : Gérer les comptes et débloquer un employé (EF-105).

Critères d'acceptation :
- CA-01 : Après réinitialisation, l'employé choisit un nouveau mot de passe à sa prochaine connexion ; ses données sont intactes.
- CA-02 : Un compte RH désactivé ne peut plus se connecter ; son historique de décisions reste visible.
- CA-03 : Chaque action est tracée.
"""

import pytest
from tests.conftest import rh_login
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A, EMP_B

ADMINS = "/api/admin/admins"
AUDIT = "/api/admin/audit"
MY_PASSWORD = "/api/admin/me/password"
PROVISIONAL = "Provisoire-2026!"
CHOSEN = "MonNouveauMot-2026!"


def _create_rh_account(admin_client, username, full_name="Agent Démo", email="agent@domaine.local", role="AGENT_RH", employee_id="EMP-0002"):
    res = admin_client.post(
        ADMINS,
        json={
            "username": username,
            "password": PROVISIONAL,
            "role": role,
            "full_name": full_name,
            "email": email,
            "employee_id": employee_id,
        },
    )
    assert res.status_code == 201
    return res.json()


def _login_and_activate(client, username, provisional=PROVISIONAL, chosen=CHOSEN):
    rh_login(client, username, provisional)
    res = client.post(
        MY_PASSWORD,
        json={"current_password": provisional, "new_password": chosen, "new_password_confirmation": chosen},
    )
    assert res.status_code == 204


# --- CA-01 : Réinitialisation d'accès employé -----------------------------------------


def test_ca01_reset_employee_access_and_re_register(admin_client, client, account, container):
    # L'employé a un mot de passe actif
    account(EMP_A, "Initial-2026!")

    # L'administrateur réinitialise son accès
    res = admin_client.post(f"/api/admin/employees/{EMP_A.id}/reset-access")
    assert res.status_code == 204

    # Les données de l'employé sont intactes mais le mot de passe est effacé
    stored = container.accounts.get(EMP_A.id)
    assert stored.password_hash is None
    folder = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    assert folder["account_activated"] is False
    assert folder["first_name"] == EMP_A.first_name
    assert folder["last_name"] == EMP_A.last_name

    # L'employé choisit un nouveau mot de passe à sa prochaine connexion
    register_res = client.post(
        "/api/auth/register",
        json=EMP_A.identity(password="Nouveau-2026!", password_confirmation="Nouveau-2026!"),
    )
    assert register_res.status_code == 204

    # La connexion avec le nouveau mot de passe fonctionne
    login_res = client.post("/api/auth/login", json=EMP_A.identity(password="Nouveau-2026!"))
    assert login_res.status_code == 204


# --- CA-02 : Désactivation d'un compte RH ---------------------------------------------


def test_ca02_disabled_rh_account_cannot_login(admin_client, client):
    # Création du compte
    created = _create_rh_account(admin_client, username="agent.bloque", full_name="Agent Bloqué")
    account_id = created["id"]
    assert created["is_active"] is True

    # Activation et première connexion
    _login_and_activate(client, "agent.bloque")
    assert client.get("/api/admin/me").status_code == 200

    # L'administrateur désactive le compte
    res_disable = admin_client.put(f"{ADMINS}/{account_id}/status", json={"is_active": False})
    assert res_disable.status_code == 200
    assert res_disable.json()["is_active"] is False

    # La session ouverte est immédiatement révoquée
    assert client.get("/api/admin/me").status_code == 401

    # Une nouvelle tentative de connexion est rejetée avec 403 ACCOUNT_DISABLED
    login_attempt = client.post(
        "/api/admin/auth/login",
        json={"username": "agent.bloque", "password": CHOSEN},
    )
    assert login_attempt.status_code == 403
    assert login_attempt.json()["error"]["code"] == "ACCOUNT_DISABLED"

    # L'administrateur réactive le compte
    res_enable = admin_client.put(f"{ADMINS}/{account_id}/status", json={"is_active": True})
    assert res_enable.status_code == 200
    assert res_enable.json()["is_active"] is True

    # La connexion est à nouveau possible
    assert rh_login(client, "agent.bloque", CHOSEN).status_code == 204


def test_ca02_cannot_deactivate_self_or_last_admin(admin_client):
    # Trouver le compte administrateur connecté
    me = next(a for a in admin_client.get(ADMINS).json() if a["is_me"])

    # Impossible de se désactiver soi-même
    res_self = admin_client.put(f"{ADMINS}/{me['id']}/status", json={"is_active": False})
    assert res_self.status_code == 409
    assert res_self.json()["error"]["code"] == "CANNOT_DEACTIVATE_SELF"

    # Créer un autre admin, puis tenter de désactiver le seul admin si on est un agent (refusé)
    # Et si on tente de désactiver le dernier admin actif
    res_last = admin_client.put(f"{ADMINS}/{me['id']}/status", json={"is_active": False})
    assert res_last.status_code == 409


# --- CA-03 : Chaque action est tracée dans l'audit ------------------------------------


def test_ca03_all_actions_are_traced_in_audit_log(admin_client, account):
    # 1. Création de compte RH tracée
    created = _create_rh_account(admin_client, username="agent.trace", full_name="Agent Tracé")
    agent_id = created["id"]

    audit_entries = admin_client.get(f"{AUDIT}?action=ACCOUNT_MANAGEMENT").json()["items"]
    creation_entry = next((e for e in audit_entries if e["target_id"] == "agent.trace"), None)
    assert creation_entry is not None
    assert "Création du compte" in creation_entry["details"]
    assert creation_entry["action"] == "ACCOUNT_MANAGEMENT"

    # 2. Désactivation tracée
    admin_client.put(f"{ADMINS}/{agent_id}/status", json={"is_active": False})
    audit_entries = admin_client.get(f"{AUDIT}?action=ACCOUNT_MANAGEMENT").json()["items"]
    disable_entry = next((e for e in audit_entries if e["target_id"] == "agent.trace" and e["details"] == "Compte désactivé"), None)
    assert disable_entry is not None

    # 3. Réactivation tracée
    admin_client.put(f"{ADMINS}/{agent_id}/status", json={"is_active": True})
    audit_entries = admin_client.get(f"{AUDIT}?action=ACCOUNT_MANAGEMENT").json()["items"]
    enable_entry = next((e for e in audit_entries if e["target_id"] == "agent.trace" and e["details"] == "Compte réactivé"), None)
    assert enable_entry is not None

    # 4. Réinitialisation employé tracée
    account(EMP_A)
    admin_client.post(f"/api/admin/employees/{EMP_A.id}/reset-access")
    audit_entries = admin_client.get(f"{AUDIT}?action=ACCOUNT_MANAGEMENT").json()["items"]
    reset_entry = next((e for e in audit_entries if e["target_id"] == EMP_A.employee_code and e["details"] == "Accès réinitialisé"), None)
    assert reset_entry is not None
    assert reset_entry["target_name"] == f"{EMP_A.first_name} {EMP_A.last_name}"
