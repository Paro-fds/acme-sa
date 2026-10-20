"""US-133 — Retrouver la file de validation et l'examen de la refonte : « pris par vous » (CA-02, CA-05), date limite de
décision (CA-05), niveau validé de l'employé (CA-06) et listes de correction venues du serveur (CA-07)."""

from app.certificate.domain.certificate import CertificateStatus
from app.certificate.domain.review import review_deadline
from tests.api.test_us401_us402_validation import _add_certificate
from tests.employees import ADMIN_USERNAME, EMP_A, EMP_B

QUEUE = "/api/admin/validation/queue"


def test_ca02_la_file_dit_ce_qui_est_pris_par_vous(admin_client, container, clock):
    _add_certificate(container, "c-mine", EMP_A.id, "Licence", "LICENCE", days_ago=2, assigned_to=ADMIN_USERNAME)
    _add_certificate(container, "c-other", EMP_B.id, "Master", "MASTER", days_ago=3, assigned_to="autre.agent")
    _add_certificate(container, "c-free", EMP_B.id, "Bac", "BACCALAUREAT", days_ago=1)

    items = {item["certificate_id"]: item for item in admin_client.get(QUEUE).json()["items"]}

    assert {key: item["assigned_to_me"] for key, item in items.items()} == {"c-mine": True, "c-other": False, "c-free": False}


def test_ca05_ca06_ca07_l_examen(admin_client, container, clock):
    _add_certificate(container, "c-old", EMP_A.id, "Licence en gestion", "LICENCE", days_ago=30, status=CertificateStatus.VALIDATED)
    _add_certificate(container, "c-new", EMP_A.id, "Master en finance", "MASTER", days_ago=2)
    submitted = container.certificates.get("c-new").submitted_at

    review = admin_client.get("/api/admin/validation/c-new").json()

    assert review["assigned_to_me"] is True  # l'ouvrir le prend
    assert review["decide_by"] == review_deadline(submitted.date()).isoformat()
    assert review["employee"]["validated_level_label"] == "Licence"
    assert review["employee"]["is_profile_complete"] is True
    choices = review["choices"]
    assert {"value": "DIPLOME", "label": "Diplôme"} in choices["types"]
    assert {"value": "MASTER", "label": "Master"} in choices["levels"]
    assert {"value": "COMPTABILITE", "label": "Comptabilité"} in choices["domains"]


def test_ca06_sans_certificat_valide_pas_de_niveau(admin_client, container, clock):
    _add_certificate(container, "c-new", EMP_A.id, "Master en finance", "MASTER", days_ago=2)

    assert admin_client.get("/api/admin/validation/c-new").json()["employee"]["validated_level_label"] is None
