"""Tests US-403 : Traiter les signalements d'erreur."""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.dossier.domain.hr_information import Report, ReportOrigin, ReportStatus, ReportDecision
from tests.employees import EMP_A, EMP_B

REPORTS_URL = "/api/admin/reports"


def _add_report(container, emp_id: str, info: str, origin: ReportOrigin, current_val: str, indicated_val: str | None, comment: str | None = None, days_ago: int = 1, status: str = "NEW"):
    now = container.clock.now()
    at = now - timedelta(days=days_ago)
    report = Report(
        employee_id=emp_id,
        information=info,
        origin=origin,
        current_value=current_val,
        indicated_value=indicated_val,
        comment=comment,
        at=at,
        status=status,
    )
    container.dossiers.add_report(report)
    return report


def test_list_reports_avec_details_employe_et_filtres(admin_client, container):
    # Créer un signalement employé et un signalement automatique
    _add_report(
        container,
        EMP_A.id,
        "position_confirmed",
        ReportOrigin.EMPLOYEE,
        current_val="Chargée de crédit",
        indicated_val="Chargée de crédit principale",
        comment="J'ai changé de poste en août.",
        days_ago=2,
    )
    _add_report(
        container,
        EMP_B.id,
        "hire_date_confirmed",
        ReportOrigin.AUTOMATIC,
        current_val="12/05/2005",
        indicated_val=None,
        comment="Date d'embauche moins de 18 ans après la date de naissance (RG-16).",
        days_ago=3,
    )

    res = admin_client.get(REPORTS_URL)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 2
    assert data["new_count"] == 2

    # Vérification des champs CA-01 & CA-03
    items = data["items"]
    emp_report = next(i for i in items if i["employee_id"] == EMP_A.id)
    assert emp_report["field_label"] == "Poste"
    assert emp_report["current_value"] == "Chargée de crédit"
    assert emp_report["indicated_value"] == "Chargée de crédit principale"
    assert emp_report["comment"] == "J'ai changé de poste en août."
    assert emp_report["origin"] == "EMPLOYEE"
    assert emp_report["origin_label"] == "Signalé par l'employé"
    assert emp_report["status"] == "NEW"
    assert emp_report["status_label"] == "Nouveau"

    auto_report = next(i for i in items if i["employee_id"] == EMP_B.id)
    assert auto_report["field_label"] == "Date d'embauche"
    assert auto_report["origin"] == "AUTOMATIC"
    assert "embauche avant 18 ans" in auto_report["origin_label"]

    # Test filtre par origine
    res_emp = admin_client.get(f"{REPORTS_URL}?origin=EMPLOYEE")
    assert res_emp.status_code == 200
    assert res_emp.json()["total"] == 1
    assert res_emp.json()["items"][0]["employee_id"] == EMP_A.id

    res_auto = admin_client.get(f"{REPORTS_URL}?origin=AUTOMATIC")
    assert res_auto.status_code == 200
    assert res_auto.json()["total"] == 1
    assert res_auto.json()["items"][0]["employee_id"] == EMP_B.id


def test_decide_report_valeur_indiquee_est_juste(admin_client, container):
    _add_report(
        container,
        EMP_A.id,
        "position_confirmed",
        ReportOrigin.EMPLOYEE,
        current_val="Chargée de crédit",
        indicated_val="Chargée de crédit principale",
        comment="Précision test",
    )
    # Récupérer l'id
    all_res = admin_client.get(REPORTS_URL).json()
    report_id = all_res["items"][0]["id"]

    # Décider : la valeur indiquée est juste (CA-02)
    decide_res = admin_client.post(
        f"{REPORTS_URL}/{report_id}/decide",
        json={"decision": "INDICATED_IS_CORRECT", "comment": "Validé avec le manager"},
    )
    assert decide_res.status_code == 200, decide_res.text
    decided_data = decide_res.json()
    assert decided_data["status"] == "CORRECTED"
    assert decided_data["status_label"] == "Corrigé — en attente du système RH"
    assert decided_data["decided_by"] == "admin"
    assert decided_data["resolution_comment"] == "Validé avec le manager"


def test_decide_report_valeur_actuelle_est_juste(admin_client, container):
    _add_report(
        container,
        EMP_A.id,
        "position_confirmed",
        ReportOrigin.EMPLOYEE,
        current_val="Chargée de crédit",
        indicated_val="Autre poste",
    )
    all_res = admin_client.get(REPORTS_URL).json()
    report_id = all_res["items"][0]["id"]

    # Décider : la valeur actuelle est juste (CA-02)
    decide_res = admin_client.post(
        f"{REPORTS_URL}/{report_id}/decide",
        json={"decision": "CURRENT_IS_CORRECT", "comment": "Information RH vérifiée, aucun avenant."},
    )
    assert decide_res.status_code == 200, decide_res.text
    decided_data = decide_res.json()
    assert decided_data["status"] == "CLOSED_ACCURATE"
    assert decided_data["status_label"] == "Clos — valeur exacte"


def test_readonly_refuse_decision(container, client):
    # Créer un compte lecture seule
    from app.auth.domain.admin import AdminAccount, AdminRole
    from app.auth.api.dependencies import SESSION_COOKIE
    now = container.clock.now()
    readonly_admin = AdminAccount(
        id="readonly-admin",
        username="readonly.demo",
        password_hash="fake-hash",
        created_at=now,
        created_by="admin",
        role=AdminRole.READONLY,
        must_change_password=False,
    )
    container.admin_accounts.save(readonly_admin)

    _add_report(
        container,
        EMP_A.id,
        "position_confirmed",
        ReportOrigin.EMPLOYEE,
        current_val="Chargée de crédit",
        indicated_val="Autre poste",
    )
    report_id = container.dossiers.list_all_reports()[0].id

    # Créer session lecture seule
    from app.auth.domain.model import SubjectType
    token = container.session_service().open(SubjectType.ADMIN, readonly_admin.id)
    client.cookies.set(SESSION_COOKIE, token)

    # Consulter fonctionne
    assert client.get(REPORTS_URL).status_code == 200

    # Décider est refusé (403)
    res = client.post(
        f"{REPORTS_URL}/{report_id}/decide",
        json={"decision": "CURRENT_IS_CORRECT"},
    )
    assert res.status_code == 403
