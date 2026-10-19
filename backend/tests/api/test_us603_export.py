"""Tests US-603 : Exporter une liste (EF-604, D-18)."""

from datetime import timedelta
import pytest
import openpyxl
import io

from app.auth.domain.admin import AdminAccount, AdminRole
from app.auth.domain.model import SubjectType
from app.auth.api.dependencies import SESSION_COOKIE
from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A, EMP_B

EXPORT_URL = "/api/admin/employees/export"


def _add_cert(
    container,
    cert_id: str,
    emp_id: str,
    level: str,
    domain: str,
    status: CertificateStatus,
):
    now = container.clock.now()
    cert = Certificate(
        id=cert_id,
        employee_id=emp_id,
        certificate_type="DIPLOME",
        level=level,
        title="Diplôme de test",
        institution="Université Test",
        year=2021,
        country=None,
        domain=domain,
        domain_other=None,
        status=status,
        submitted_at=now,
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


def test_us603_ca01_ca02_export_csv_filtres_et_audit(admin_client, container):
    # Ajouter un certificat validé pour EMP_A en Licence Comptabilité
    _add_cert(
        container,
        "cert-export-a",
        EMP_A.id,
        level="LICENCE",
        domain="COMPTABILITE",
        status=CertificateStatus.VALIDATED,
    )

    # Avant export : compter les entrées d'audit
    audit_before = len(container.audit_logs.list_all(action="EXPORT"))

    # Requête d'export CSV avec filtres (CA-01)
    res = admin_client.get(
        EXPORT_URL,
        params={"min_level": "au moins Licence", "domain": "Comptabilité", "format": "csv"},
    )
    assert res.status_code == 200, res.text
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]

    content = res.text
    # CA-01 : Contient EMP_A
    assert EMP_A.employee_code in content
    assert "Licence" in content
    assert "Comptabilité" in content

    # CA-02 : Ne contient JAMAIS de salaire ni de contact d'urgence
    assert "salary" not in content.lower()
    assert "salaire" not in content.lower()
    assert "urgence" not in content.lower()
    assert "emergency" not in content.lower()

    # CA-02 : Tracé dans l'audit_log
    audit_after = container.audit_logs.list_all(action="EXPORT")
    assert len(audit_after) == audit_before + 1
    latest_audit = audit_after[0]
    assert "min_level=au moins Licence" in latest_audit.details
    assert "domain=Comptabilité" in latest_audit.details


def test_us603_ca01_export_xlsx(admin_client, container):
    _add_cert(
        container,
        "cert-export-xlsx",
        EMP_A.id,
        level="MASTER",
        domain="GESTION",
        status=CertificateStatus.VALIDATED,
    )

    res = admin_client.get(
        EXPORT_URL,
        params={"min_level": "au moins Master", "domain": "Gestion", "format": "xlsx"},
    )
    assert res.status_code == 200, res.text
    assert "openxmlformats" in res.headers["content-type"]

    # Ouvrir le classeur Excel et vérifier son contenu
    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    assert len(rows) >= 2  # En-tête + au moins 1 ligne
    headers = rows[0]
    assert "Matricule" in headers
    assert "Niveau validé" in headers
    assert "Domaine" in headers
    assert "Salaire" not in headers
    assert "Contact d'urgence" not in headers


def test_us603_d18_reserve_a_administrateur_seul(container, client):
    # Créer un compte Agent RH (non-admin)
    now = container.clock.now()
    agent_rh = AdminAccount(
        id="agent-rh-user",
        username="agent.rh",
        password_hash="fake-hash",
        created_at=now,
        created_by="admin",
        role=AdminRole.AGENT_RH,
        must_change_password=False,
    )
    container.admin_accounts.save(agent_rh)

    token = container.session_service().open(SubjectType.ADMIN, agent_rh.id)
    client.cookies.set(SESSION_COOKIE, token)

    # Tentative d'export par un Agent RH -> 403 Forbidden
    res = client.get(EXPORT_URL)
    assert res.status_code == 403
