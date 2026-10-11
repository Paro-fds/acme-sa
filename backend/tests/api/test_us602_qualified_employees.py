"""Tests US-602 : Trouver les employés qualifiés en une minute (Écran A06)."""

from datetime import timedelta
import pytest

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A, EMP_B

SEARCH_URL = "/api/admin/employees/search"


def _add_cert(
    container,
    cert_id: str,
    emp_id: str,
    level: str,
    domain: str,
    status: CertificateStatus,
    days_ago: int = 1,
):
    now = container.clock.now()
    submitted_at = now - timedelta(days=days_ago)
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
        submitted_at=submitted_at,
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


def test_us602_ca01_ca02_filtre_niveau_domaine_et_certificats_valides(admin_client, container):
    # EMP_A : Certificat VALIDÉ en Licence Comptabilité
    _add_cert(
        container,
        "cert-valid-licence",
        EMP_A.id,
        level="LICENCE",
        domain="COMPTABILITE",
        status=CertificateStatus.VALIDATED,
    )

    # EMP_B : Certificat EN ATTENTE en Master Comptabilité (CA-02 : ne doit PAS compter)
    _add_cert(
        container,
        "cert-pending-master",
        EMP_B.id,
        level="MASTER",
        domain="COMPTABILITE",
        status=CertificateStatus.RECEIVED,
    )

    # Recherche CA-01 : min_level="au moins Licence", domain="Comptabilité"
    res = admin_client.get(
        SEARCH_URL,
        params={"min_level": "au moins Licence", "domain": "Comptabilité"},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    # EMP_A est qualifié (Licence validée >= Licence)
    # EMP_B n'est PAS qualifié car son certificat est en attente (CA-02)
    emp_ids = [item["id"] for item in data["items"]]
    assert EMP_A.id in emp_ids
    assert EMP_B.id not in emp_ids

    # Vérification des détails de EMP_A
    emp_a_data = next(item for item in data["items"] if item["id"] == EMP_A.id)
    assert emp_a_data["validated_level"] == "LICENCE"
    assert emp_a_data["validated_domain"] == "COMPTABILITE"
    assert emp_a_data["validated_rank"] == 6

    # ENF-07 : Aucun salaire ni donnée sensible retournée
    for item in data["items"]:
        assert "salary" not in item
        assert "remuneration" not in item
        assert "salaire" not in item


def test_us602_ca03_filtres_combines_agence_statut_et_recherche(admin_client, container):
    # Compléter le profil de EMP_A pour changer son statut de dossier en Dossier complet
    from app.dossier.domain.dossier import Confirmation, Dossier, EmergencyContact, Gesture
    now = container.clock.now()
    dossier_a = Dossier(
        employee_id=EMP_A.id,
        telephone="+2250102030405",
        address="Rue des Jardins, Abidjan",
        email="emp.a@example.com",
        education_level="SUPERIEUR_CYCLE2",
        emergency_contact=EmergencyContact("Marie Démo", "CONJOINT", "+2250506070809"),
    )
    confirmations = [
        Confirmation(EMP_A.id, "telephone", Gesture.CONFIRMATION, None, "+2250102030405", now),
        Confirmation(EMP_A.id, "address", Gesture.ENTRY, None, "Rue des Jardins, Abidjan", now),
        Confirmation(EMP_A.id, "email", Gesture.ENTRY, None, "emp.a@example.com", now),
        Confirmation(EMP_A.id, "education_level", Gesture.ENTRY, None, "SUPERIEUR_CYCLE2", now),
        Confirmation(EMP_A.id, "emergency_contact", Gesture.ENTRY, None, "Marie Démo (CONJOINT) +2250506070809", now),
        Confirmation(EMP_A.id, "agency_confirmed", Gesture.CONFIRMATION, "Agence Démo Sud", "Agence Démo Sud", now),
        Confirmation(EMP_A.id, "position_confirmed", Gesture.CONFIRMATION, "Analyste crédit", "Analyste crédit", now),
        Confirmation(EMP_A.id, "hire_date_confirmed", Gesture.CONFIRMATION, "01/01/2020", "01/01/2020", now),
    ]
    container.dossiers.save(dossier_a, confirmations)

    # Ajouter un certificat validé pour EMP_A pour que son dossier soit FOLDER_COMPLETE
    _add_cert(
        container,
        "cert-complete-a",
        EMP_A.id,
        level="LICENCE",
        domain="COMPTABILITE",
        status=CertificateStatus.VALIDATED,
    )

    # Filtrer par statut de dossier
    res_status = admin_client.get(SEARCH_URL, params={"folder_status": "Dossier complet"})
    assert res_status.status_code == 200
    ids_complete = [item["id"] for item in res_status.json()["items"]]
    assert EMP_A.id in ids_complete

    # Filtrer par recherche textuelle (nom ou matricule)
    res_search = admin_client.get(SEARCH_URL, params={"search": EMP_A.employee_code})
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) == 1
    assert res_search.json()["items"][0]["id"] == EMP_A.id


def test_us602_ca04_consultation_dossier_tracee_dans_audit(admin_client, container):
    # Vérifier l'audit avant consultation
    audit_entries_before = container.audit_logs.list_all()
    count_before = len([e for e in audit_entries_before if e.action == "DOSSIER_VIEW" and e.target_id == EMP_A.employee_code])

    # Consulter le dossier de EMP_A
    res = admin_client.get(f"/api/admin/employees/{EMP_A.id}")
    assert res.status_code == 200, res.text

    # Vérifier que l'audit_log contient l'action DOSSIER_VIEW
    audit_entries_after = container.audit_logs.list_all()
    matching_entries = [e for e in audit_entries_after if e.action == "DOSSIER_VIEW" and e.target_id == EMP_A.employee_code]
    assert len(matching_entries) == count_before + 1
    latest_entry = matching_entries[-1]
    assert latest_entry.target_name == f"{EMP_A.first_name} {EMP_A.last_name}"
    assert "Consultation du dossier" in latest_entry.details
