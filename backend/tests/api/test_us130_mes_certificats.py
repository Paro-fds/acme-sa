"""US-130 — Retrouver « Mes certificats » de la refonte : ce que l'API dit à l'employé de chaque certificat (CA-08),
et le renvoi d'un certificat « À corriger » (CA-06)."""

from datetime import date

from app.certificate.domain.certificate import CertificateStatus
from app.certificate.domain.review import review_deadline
from tests.api.test_us301_depot import _deposit
from tests.api.test_us801_postes_eligibles import _certificate
from tests.conftest import complete_profile
from tests.employees import EMP_A

CERTIFICATES = "/api/me/certificates"
REASON = "Document illisible ou de mauvaise qualité"


def _listed(client) -> dict[str, dict]:
    return {c["id"]: c for c in client.get(CERTIFICATES).json()["certificates"]}


def test_review_deadline_5_jours_ouvrables_apres_le_depot():
    assert review_deadline(date(2026, 10, 4)) == date(2026, 10, 9)  # dimanche → vendredi
    assert review_deadline(date(2026, 10, 15)) == date(2026, 10, 22)  # jeudi → jeudi suivant
    assert review_deadline(date(2026, 10, 16)) == date(2026, 10, 23)  # vendredi → vendredi suivant


def test_ca08_en_examen_la_date_limite_de_reponse_sans_decision(employee_client, container, clock):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE", status=CertificateStatus.RECEIVED)

    listed = _listed(employee_client(EMP_A))[f"cert-{EMP_A.id}-1"]

    assert listed["answer_by"] == "2026-10-09"
    assert listed["decided_at"] is None
    assert listed["rejection_reason"] is None
    assert listed["rejection_comment"] is None


def test_ca08_a_corriger_le_motif_le_commentaire_et_la_date_jamais_l_agent(admin_client, employee_client, container, clock):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE", status=CertificateStatus.RECEIVED)
    certificate_id = f"cert-{EMP_A.id}-1"
    decided = admin_client.post(
        f"/api/admin/validation/{certificate_id}/decide",
        json={"decision": "REJECTED", "reason": REASON, "comment": "La photo est floue."},
    )
    assert decided.status_code == 200, decided.text

    listed = _listed(employee_client(EMP_A))[certificate_id]

    assert listed["status"] == "TO_CORRECT"
    assert listed["rejection_reason"] == REASON
    assert listed["rejection_comment"] == "La photo est floue."
    assert listed["decided_at"].startswith("2026-10-04")
    assert listed["answer_by"] is None
    assert "decided_by" not in listed
    assert container.certificates.get(certificate_id).decided_by not in str(listed)


def test_ca08_valide_la_date_de_decision_sans_motif(admin_client, employee_client, container, clock):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE", status=CertificateStatus.RECEIVED)
    certificate_id = f"cert-{EMP_A.id}-1"
    assert admin_client.post(f"/api/admin/validation/{certificate_id}/decide", json={"decision": "VALIDATED"}).status_code == 200

    listed = _listed(employee_client(EMP_A))[certificate_id]

    assert listed["decided_at"].startswith("2026-10-04")
    assert listed["rejection_reason"] is None
    assert listed["answer_by"] is None


def test_ca06_renvoyer_un_certificat_a_corriger(admin_client, employee_client, container):
    client = employee_client(EMP_A)
    complete_profile(client)
    first = _deposit(client).json()
    admin_client.post(f"/api/admin/validation/{first['id']}/decide", json={"decision": "REJECTED", "reason": REASON})

    again = _deposit(client, replaces_id=first["id"])

    assert again.status_code == 201, again.text
    listed = _listed(client)
    assert listed[again.json()["id"]]["status"] == "RECEIVED"
    assert listed[again.json()["id"]]["replaces_id"] == first["id"]
    assert listed[first["id"]]["is_archived"] is True
    assert listed[first["id"]]["rejection_reason"] == REASON  # la preuve garde sa décision
