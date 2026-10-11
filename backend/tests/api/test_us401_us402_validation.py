"""Tests US-401 et US-402 : File de validation et examen unitaire des certificats."""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A, EMP_B

QUEUE_URL = "/api/admin/validation/queue"
CLAIM_URL = "/api/admin/validation/claim-next"


def _add_certificate(container, cert_id: str, emp_id: str, title: str, level: str, days_ago: int, status=CertificateStatus.RECEIVED, assigned_to=None):
    now = container.clock.now()
    submitted_at = now - timedelta(days=days_ago)
    cert = Certificate(
        id=cert_id,
        employee_id=emp_id,
        certificate_type="DIPLOME",
        level=level,
        title=title,
        institution="Université Test",
        year=2020,
        country=None,
        domain="COMPTABILITE",
        domain_other=None,
        status=status,
        submitted_at=submitted_at,
        assigned_to=assigned_to,
        assigned_at=now if assigned_to else None,
    )
    file = CertificateFile(
        certificate_id=cert_id,
        storage_key=f"certs/{cert_id}.pdf",
        original_name="diplome.pdf",
        content_type="application/pdf",
        size_bytes=1024,
    )
    container.certificates.add(cert, file)
    container.certificate_storage.receive(file.storage_key, b"%PDF-dummy-content")
    return cert


def test_queue_triee_et_calcul_retard(admin_client, container):
    # Créer 3 certificats : un déposé il y a 8 jours (en retard), un il y a 2 jours, un il y a 10 jours
    _add_certificate(container, "c-recent", EMP_A.id, "Licence récente", "LICENCE", days_ago=2)
    _add_certificate(container, "c-old", EMP_B.id, "Master ancien", "MASTER", days_ago=10)

    res = admin_client.get(QUEUE_URL)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total_waiting"] == 2
    assert data["total_overdue"] == 1  # 10 jours -> > 5 jours ouvrables

    # Tri du plus ancien au plus récent
    items = data["items"]
    assert len(items) == 2
    assert items[0]["certificate_id"] == "c-old"
    assert items[0]["is_overdue"] is True
    assert items[1]["certificate_id"] == "c-recent"
    assert items[1]["is_overdue"] is False


def test_claim_next_certificate(admin_client, container):
    _add_certificate(container, "c-1", EMP_A.id, "Certificat 1", "LICENCE", days_ago=3)
    _add_certificate(container, "c-2", EMP_B.id, "Certificat 2", "MASTER", days_ago=1)

    res = admin_client.post(CLAIM_URL)
    assert res.status_code == 200
    assert res.json()["claimed"] is True
    assert res.json()["certificate_id"] == "c-1"

    # Vérifier que le certificat passe en IN_REVIEW
    cert = container.certificates.get("c-1")
    assert cert.status == CertificateStatus.IN_REVIEW
    assert cert.assigned_to is not None

    # Historique tracé
    history = container.certificates.history_of("c-1")
    assert any(h.action == "CLAIMED" for h in history)


def test_review_and_correct_fields(admin_client, container):
    _add_certificate(container, "c-rev", EMP_A.id, "Licence en Économie", "LICENCE", days_ago=1)

    # Récupérer l'examen
    res = admin_client.get("/api/admin/validation/c-rev")
    assert res.status_code == 200
    review = res.json()
    assert review["certificate"]["id"] == "c-rev"
    assert review["employee"]["id"] == EMP_A.id
    assert len(review["files"]) == 1

    # Corriger les champs (ex: changer le niveau en MASTER)
    correct_res = admin_client.patch(
        "/api/admin/validation/c-rev/fields",
        json={
            "certificate_type": "DIPLOME",
            "level": "MASTER",
            "title": "Master en Économie",
            "institution": "Université Test",
            "year": 2021,
            "domain": "ECONOMIE",
            "country": None,
        },
    )
    assert correct_res.status_code == 200
    assert correct_res.json()["original_level"] == "LICENCE"

    cert_after = container.certificates.get("c-rev")
    assert cert_after.level == "MASTER"
    assert cert_after.original_level == "LICENCE"


def test_validate_certificate(admin_client, container):
    _add_certificate(container, "c-val", EMP_A.id, "Licence à valider", "LICENCE", days_ago=1)

    res = admin_client.post(
        "/api/admin/validation/c-val/decide",
        json={"decision": "VALIDATED"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "VALIDATED"

    cert = container.certificates.get("c-val")
    assert cert.status == CertificateStatus.VALIDATED
    assert cert.decided_by is not None

    history = container.certificates.history_of("c-val")
    assert any(h.action == "VALIDATED" for h in history)


def test_reject_certificate_with_motifs(admin_client, container):
    _add_certificate(container, "c-rej", EMP_A.id, "Licence floue", "LICENCE", days_ago=1)

    # Rejet sans motif -> 422/erreur
    bad = admin_client.post("/api/admin/validation/c-rej/decide", json={"decision": "REJECTED"})
    assert bad.status_code in (400, 422)

    # Rejet "Autre" sans commentaire -> 400
    bad_autre = admin_client.post(
        "/api/admin/validation/c-rej/decide",
        json={"decision": "REJECTED", "reason": "Autre", "comment": "   "},
    )
    assert bad_autre.status_code in (400, 422)

    # Rejet conforme avec motif officiel
    good = admin_client.post(
        "/api/admin/validation/c-rej/decide",
        json={
            "decision": "REJECTED",
            "reason": "Document illisible ou de mauvaise qualité",
            "comment": "Merci de refaire une photo avec plus de lumière.",
        },
    )
    assert good.status_code == 200
    assert good.json()["status"] == "TO_CORRECT"

    cert = container.certificates.get("c-rej")
    assert cert.status == CertificateStatus.TO_CORRECT
    assert cert.rejection_reason == "Document illisible ou de mauvaise qualité"
