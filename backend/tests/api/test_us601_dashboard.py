"""Tests US-601 : Tableau de bord de pilotage RH."""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A, EMP_B

DASHBOARD_URL = "/api/admin/dashboard"


def _add_cert(container, cert_id: str, emp_id: str, status: CertificateStatus, days_ago: int = 1, decided_days_ago: int | None = None):
    now = container.clock.now()
    submitted_at = now - timedelta(days=days_ago)
    decided_at = (now - timedelta(days=decided_days_ago)) if decided_days_ago is not None else None
    cert = Certificate(
        id=cert_id,
        employee_id=emp_id,
        certificate_type="DIPLOME",
        level="LICENCE",
        title="Test Titre",
        institution="Test Univ",
        year=2021,
        country=None,
        domain="COMPTABILITE",
        domain_other=None,
        status=status,
        submitted_at=submitted_at,
        decided_at=decided_at,
    )
    file = CertificateFile(
        certificate_id=cert_id,
        storage_key=f"certs/{cert_id}.pdf",
        original_name="test.pdf",
        content_type="application/pdf",
        size_bytes=1024,
    )
    container.certificates.add(cert, file)
    return cert


def test_get_pilot_dashboard_kpis_et_repartition(admin_client, container):
    # Ajouter certificats
    _add_cert(container, "c-waiting-1", EMP_A.id, CertificateStatus.RECEIVED, days_ago=2)
    _add_cert(container, "c-overdue", EMP_B.id, CertificateStatus.RECEIVED, days_ago=10)
    _add_cert(container, "c-rejected", EMP_A.id, CertificateStatus.TO_CORRECT, days_ago=3, decided_days_ago=1)

    res = admin_client.get(DASHBOARD_URL)
    assert res.status_code == 200, res.text
    data = res.json()

    # KPI (CA-01)
    kpi = data["kpi"]
    assert kpi["active_employees"] >= 2
    assert kpi["target_percent"] == 90
    assert kpi["waiting_certificates"] == 2
    assert kpi["overdue_certificates"] == 1
    assert kpi["rejected_this_month"] == 1

    # Distribution
    dist = data["distribution"]
    assert dist["incomplete_profile_count"] + dist["complete_profile_count"] + dist["complete_folder_count"] == kpi["active_employees"]

    # À traiter
    to_proc = data["to_process"]
    assert to_proc["overdue_certificates"] == 1

    # Décomposition par agence, région, direction (CA-02)
    by_agency = data["by_agency"]
    assert len(by_agency) > 0
    agency_item = by_agency[0]
    assert "unit_label" in agency_item
    assert "employees_count" in agency_item
    assert "complete_folders_percent" in agency_item

    assert len(data["by_region"]) > 0
    assert len(data["by_direction"]) > 0


def test_pilot_dashboard_accessible_en_lecture_seule(container, client):
    from app.auth.domain.admin import AdminAccount, AdminRole
    from app.auth.domain.model import SubjectType
    from app.auth.api.dependencies import SESSION_COOKIE
    now = container.clock.now()
    readonly_admin = AdminAccount(
        id="readonly-pilot",
        username="readonly.pilot",
        password_hash="fake-hash",
        created_at=now,
        created_by="admin",
        role=AdminRole.READONLY,
        must_change_password=False,
    )
    container.admin_accounts.save(readonly_admin)

    token = container.session_service().open(SubjectType.ADMIN, readonly_admin.id)
    client.cookies.set(SESSION_COOKIE, token)

    # Lecture seule a bien accès au tableau de bord (récit US-601)
    res = client.get(DASHBOARD_URL)
    assert res.status_code == 200
