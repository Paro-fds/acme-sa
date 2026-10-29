"""US-304 : Garder la preuve des certificats (EF-305, RG-27).

Critères d'acceptation :
- CA-01 : Un certificat validé ne peut pas être supprimé.
- CA-02 : Remplacé, l'ancien reste archivé avec son historique de décisions.
"""

from datetime import timedelta
import pytest

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.api.test_us301_depot import _deposit
from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B

CERTIFICATES_URL = "/api/me/certificates"


def test_ca01_un_certificat_valide_ne_peut_pas_etre_supprime(employee_client, admin_client, container):
    """CA-01 : Un certificat validé constitue une preuve irrévocable : DELETE refusé."""
    emp_client = employee_client(EMP_A)
    complete_profile(emp_client)

    # 1. Dépôt d'un certificat
    depot_res = _deposit(emp_client, title="Diplôme d'Ingénieur", level="MASTER", domain="INFORMATIQUE")
    assert depot_res.status_code == 201
    cert_id = depot_res.json()["id"]

    # 2. Validation par un agent RH
    decide_res = admin_client.post(
        f"/api/admin/validation/{cert_id}/decide",
        json={"decision": "VALIDATED"},
    )
    assert decide_res.status_code == 200

    cert_db = container.certificates.get(cert_id)
    assert cert_db.status == CertificateStatus.VALIDATED

    # 3. Tentative de suppression par l'employé -> INTERDITE
    delete_res = emp_client.delete(f"{CERTIFICATES_URL}/{cert_id}")
    assert delete_res.status_code in (400, 403)
    error_data = delete_res.json()
    assert error_data["error"]["code"] == "CANNOT_DELETE_VALIDATED_CERTIFICATE"

    # Vérifier que le certificat existe toujours et reste intact
    assert container.certificates.get(cert_id) is not None
    assert container.certificates.get(cert_id).status == CertificateStatus.VALIDATED


def test_ca01_un_certificat_non_valide_peut_etre_supprime(employee_client, container):
    """Un certificat en attente (RECEIVED) peut être supprimé avant validation."""
    emp_client = employee_client(EMP_A)
    complete_profile(emp_client)

    depot_res = _deposit(emp_client, title="Certificat provisoire", level="LICENCE", domain="GESTION")
    assert depot_res.status_code == 201
    cert_id = depot_res.json()["id"]

    delete_res = emp_client.delete(f"{CERTIFICATES_URL}/{cert_id}")
    assert delete_res.status_code == 204

    # Le certificat a bien été supprimé
    assert container.certificates.get(cert_id) is None


def test_ca02_remplace_l_ancien_reste_archive_avec_son_historique(employee_client, admin_client, container, clock):
    """CA-02 : Remplacé, l'ancien certificat reste archivé avec son historique de décisions complet."""
    emp_client = employee_client(EMP_A)
    complete_profile(emp_client)

    # 1. Dépôt et validation du premier certificat (ex: Licence)
    res_c1 = _deposit(emp_client, title="Licence Comptabilité", level="LICENCE", domain="COMPTABILITE")
    assert res_c1.status_code == 201
    c1_id = res_c1.json()["id"]

    clock.advance(minutes=5)
    admin_client.post(
        f"/api/admin/validation/{c1_id}/decide",
        json={"decision": "VALIDATED"},
    )

    # Vérifier que C1 est validé avec une entrée dans son historique
    c1_history = container.certificates.history_of(c1_id)
    assert any(h.action == "VALIDATED" for h in c1_history)

    # 2. L'employé dépose un nouveau certificat qui remplace C1
    clock.advance(minutes=5)
    res_c2 = _deposit(
        emp_client,
        title="Master Comptabilité Approfondie",
        level="MASTER",
        domain="COMPTABILITE",
        replaces_id=c1_id,
    )
    assert res_c2.status_code == 201
    c2_id = res_c2.json()["id"]

    # 3. Vérifications sur C1 (l'ancien certificat)
    c1_after = container.certificates.get(c1_id)
    assert c1_after is not None
    assert c1_after.status == CertificateStatus.VALIDATED
    assert c1_after.is_archived is True

    # L'historique de C1 a conservé sa décision VALIDATED et a reçu l'action REPLACED
    c1_history_after = container.certificates.history_of(c1_id)
    actions = [h.action for h in c1_history_after]
    assert "VALIDATED" in actions
    assert "REPLACED" in actions
    assert any(c2_id in (h.details or "") for h in c1_history_after)

    # Même archivé, C1 étant validé, il ne peut pas être supprimé
    del_c1 = emp_client.delete(f"{CERTIFICATES_URL}/{c1_id}")
    assert del_c1.status_code in (400, 403)

    # 4. Vérification pour l'Agent RH : consultation des certificats de l'employé
    # L'agent RH retrouve TOUT certificat validé, même remplacé
    rh_res = admin_client.get(f"/api/admin/employees/{EMP_A.id}/certificates")
    assert rh_res.status_code == 200, rh_res.text
    certs_list = rh_res.json()
    assert len(certs_list) == 2

    # Retrouver l'ancien C1 dans la réponse RH
    c1_view = next(c for c in certs_list if c["id"] == c1_id)
    assert c1_view["status"] == "VALIDATED"
    assert c1_view["is_archived"] is True
    assert len(c1_view["history"]) >= 2  # VALIDATED et REPLACED
    assert any(h["action"] == "VALIDATED" for h in c1_view["history"])
    assert any(h["action"] == "REPLACED" for h in c1_view["history"])

    # Retrouver le nouveau C2
    c2_view = next(c for c in certs_list if c["id"] == c2_id)
    assert c2_view["replaces_id"] == c1_id
    assert c2_view["is_archived"] is False
