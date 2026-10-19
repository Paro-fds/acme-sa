"""Tests US-604 : Rendre compte de chaque action (EF-605, ENF-08)."""

from datetime import datetime, timezone
import pytest

from app.admin.domain.audit import AuditAction, AuditEntry

AUDIT_URL = "/api/admin/audit"


def _add_entry(container, actor_id: str, actor_name: str, action: str, target_id: str, target_name: str, details: str, at: datetime):
    entry = AuditEntry(
        id=None,
        at=at,
        actor_id=actor_id,
        actor_name=actor_name,
        action=action,
        target_id=target_id,
        target_name=target_name,
        details=details,
    )
    container.audit_logs.add(entry)
    return entry


def test_us604_ca01_ca03_consultation_et_filtres(admin_client, container):
    # Ajouter plusieurs entrées d'audit à des dates différentes
    date_oct = datetime(2026, 10, 6, 14, 12, tzinfo=timezone.utc)
    date_sept = datetime(2026, 9, 15, 10, 0, tzinfo=timezone.utc)

    _add_entry(
        container,
        actor_id="agent-1",
        actor_name="Agent RH Démo 1",
        action=AuditAction.VALIDATION.value,
        target_id="EMP-1001",
        target_name="Lucie Exemple",
        details="Licence en Sciences comptables validée",
        at=date_oct,
    )
    _add_entry(
        container,
        actor_id="agent-2",
        actor_name="Agent RH Démo 2",
        action=AuditAction.REJECTION.value,
        target_id="EMP-1002",
        target_name="Marc Démo",
        details="Motif : Document illisible",
        at=date_oct,
    )
    _add_entry(
        container,
        actor_id="admin-1",
        actor_name="Administrateur Démo",
        action=AuditAction.DOSSIER_VIEW.value,
        target_id="EMP-1003",
        target_name="Paul Démo",
        details="Consultation du dossier",
        at=date_sept,
    )

    # Consultation globale
    res = admin_client.get(AUDIT_URL)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] >= 3
    items = data["items"]
    # Vérifier CA-01 : qui, quoi, quand
    val_item = next(i for i in items if i["action"] == AuditAction.VALIDATION.value)
    assert val_item["actor_name"] == "Agent RH Démo 1"
    assert val_item["target_name"] == "Lucie Exemple"
    assert "Sciences comptables" in val_item["details"]

    # CA-03 : Filtrage par personne (actor)
    res_actor = admin_client.get(AUDIT_URL, params={"actor": "Agent RH Démo 1"})
    assert res_actor.status_code == 200
    assert all(i["actor_name"] == "Agent RH Démo 1" for i in res_actor.json()["items"])

    # CA-03 : Filtrage par type d'action
    res_action = admin_client.get(AUDIT_URL, params={"action": AuditAction.REJECTION.value})
    assert res_action.status_code == 200
    assert all(i["action"] == AuditAction.REJECTION.value for i in res_action.json()["items"])

    # CA-03 : Filtrage par employé (target)
    res_target = admin_client.get(AUDIT_URL, params={"target": "Marc Démo"})
    assert res_target.status_code == 200
    assert len(res_target.json()["items"]) >= 1
    assert any("Marc Démo" in i["target_name"] for i in res_target.json()["items"])

    # CA-03 : Filtrage par période (ex: "2026-10")
    res_period = admin_client.get(AUDIT_URL, params={"period": "2026-10"})
    assert res_period.status_code == 200
    period_items = res_period.json()["items"]
    assert all("2026-10" in i["at"] for i in period_items)


def test_us604_ca02_impossibilite_de_modifier_ou_supprimer_le_journal(admin_client):
    # CA-02 : Personne ne peut modifier ni supprimer une ligne du journal
    res_del = admin_client.delete(f"{AUDIT_URL}/1")
    assert res_del.status_code in (404, 405)

    res_put = admin_client.put(f"{AUDIT_URL}/1", json={"details": "tentative"})
    assert res_put.status_code in (404, 405)

    res_post = admin_client.post(AUDIT_URL, json={"details": "tentative"})
    assert res_post.status_code in (404, 405)
