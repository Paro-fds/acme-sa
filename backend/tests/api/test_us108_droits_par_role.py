"""US-108 (choix du 2026-10-11) : chaque rôle RH ne voit et ne fait que ce qui relève de sa fonction (cahier des charges §4.3).

Journal d'audit : Administrateur seul. Comptes et rôles, réinitialiser un accès : Administrateur seul.
Référentiel (import, « À rattacher ») : Administrateur et Responsable du référentiel.
Responsable du référentiel : consulte aussi dossiers et tableau de bord, sans certificats, signalements ni postes.
Valider un certificat, traiter un signalement : Administrateur et Agent RH.
"""

import pytest
from fastapi.testclient import TestClient

from tests.api.test_us103_roles_rh import _create_admin_with_role, _login_and_activate

ALLOWED, FORBIDDEN = True, False

# (méthode, adresse) → rôles autorisés
RULES = {
    ("GET", "/api/admin/dashboard"): {"ADMIN", "AGENT_RH", "REFERENTIAL", "READONLY"},
    ("GET", "/api/admin/menu-counts"): {"ADMIN", "AGENT_RH", "REFERENTIAL", "READONLY"},
    ("GET", "/api/admin/employees/search"): {"ADMIN", "AGENT_RH", "REFERENTIAL", "READONLY"},
    ("GET", "/api/admin/employees/1001/dossier"): {"ADMIN", "AGENT_RH", "REFERENTIAL", "READONLY"},
    ("GET", "/api/admin/referential"): {"ADMIN", "AGENT_RH", "REFERENTIAL", "READONLY"},
    ("POST", "/api/admin/referential/import"): {"ADMIN", "REFERENTIAL"},
    ("GET", "/api/admin/validation/queue"): {"ADMIN", "AGENT_RH", "READONLY"},
    ("POST", "/api/admin/validation/claim-next"): {"ADMIN", "AGENT_RH"},
    ("POST", "/api/admin/validation/inconnu/decide"): {"ADMIN", "AGENT_RH"},
    ("GET", "/api/admin/reports"): {"ADMIN", "AGENT_RH", "READONLY"},
    ("POST", "/api/admin/reports/999/decide"): {"ADMIN", "AGENT_RH"},
    ("GET", "/api/admin/openings"): {"ADMIN", "AGENT_RH", "READONLY"},
    ("GET", "/api/admin/admins"): {"ADMIN"},
    ("GET", "/api/admin/roles"): {"ADMIN"},
    ("POST", "/api/admin/employees/1001/reset-access"): {"ADMIN"},
    ("GET", "/api/admin/audit"): {"ADMIN"},
}

ROLES = ["AGENT_RH", "REFERENTIAL", "READONLY"]


@pytest.fixture
def role_clients(admin_client, app):
    """Un client connecté par rôle RH (hors Administrateur, couvert par `admin_client`)."""
    clients = {"ADMIN": admin_client}
    for role in ROLES:
        username = f"droits.{role.lower().replace('_', '')}"
        _create_admin_with_role(admin_client, username=username, role=role)
        client = TestClient(app)
        _login_and_activate(client, username)
        clients[role] = client
    return clients


def test_chaque_role_ne_fait_que_ce_qui_releve_de_sa_fonction(role_clients):
    wrong = []
    for (method, url), allowed in RULES.items():
        for role, client in role_clients.items():
            status = client.request(method, url).status_code
            refused = status == 403
            if (role in allowed) == refused:
                wrong.append(f"{role} {method} {url} → {status}")
    assert wrong == []


def test_refus_avec_un_message_clair(role_clients):
    res = role_clients["AGENT_RH"].get("/api/admin/audit")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "INSUFFICIENT_ROLE"
