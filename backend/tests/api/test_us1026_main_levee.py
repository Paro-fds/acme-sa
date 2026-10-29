"""US-1026 — Lever le gel de 72 heures d'un employé depuis l'espace de gestion (`main_levee` du directeur, D-64)."""

from datetime import timedelta

from app.auth.domain.contacts import SeenContact
from app.auth.domain.login_code import LoginChannel
from tests.employees import EMP_A, EMP_E

FOLDER = f"/api/admin/employees/{EMP_A.id}"
LIFT = f"{FOLDER}/lift-hold"
NOTICE = "La DRH a levé le gel de votre accès à PAM. Vous pouvez demander un code de vérification."


def _hold(container, employee=EMP_A, channel=LoginChannel.EMAIL, hours_ago=1):
    """Un contact changé il y a `hours_ago` heures : gelé pendant 72 heures (US-1005)."""
    changed = container.clock.now() - timedelta(hours=hours_ago)
    container.seen_contacts.save(SeenContact(employee.id, channel, "nouveau@exemple.test", changed_at=changed))


def test_ca01_le_dossier_montre_le_gel_en_cours(admin_client, container):
    assert admin_client.get(FOLDER).json()["contact_hold"] is False

    _hold(container)

    assert admin_client.get(FOLDER).json()["contact_hold"] is True


def test_ca01_un_gel_de_plus_de_72_heures_n_est_plus_en_cours(admin_client, container):
    _hold(container, hours_ago=73)

    assert admin_client.get(FOLDER).json()["contact_hold"] is False


def test_ca02_lever_le_gel_du_courriel_et_du_numero(admin_client, container):
    _hold(container, channel=LoginChannel.EMAIL)
    _hold(container, channel=LoginChannel.WHATSAPP)

    response = admin_client.post(LIFT)

    assert response.status_code == 200, response.text
    assert response.json() == {"message": "Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier."}
    now = container.clock.now()
    for channel in (LoginChannel.EMAIL, LoginChannel.WHATSAPP):
        seen = container.seen_contacts.get(EMP_A.id, channel)
        assert not seen.is_held(now) and seen.value == "nouveau@exemple.test"  # le contact n'est pas modifié
    assert admin_client.get(FOLDER).json()["contact_hold"] is False


def test_ca02_sans_gel_en_cours(admin_client):
    response = admin_client.post(LIFT)

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Aucun gel en cours pour ce code."


def test_ca02_la_main_levee_est_tracee(admin_client, container):
    _hold(container)

    admin_client.post(LIFT)

    entries = admin_client.get("/api/admin/audit").json()["items"]
    assert any(entry["target_id"] == EMP_A.employee_code and "Gel de 72 heures levé" in entry["details"] for entry in entries)


def test_ca02_employe_inconnu(admin_client):
    assert admin_client.post("/api/admin/employees/9999/lift-hold").status_code == 404


def test_ca03_l_employe_recoit_l_avis_html(admin_client, container):
    _hold(container)
    container.email_sender.outbox.clear()

    admin_client.post(LIFT)

    (notice,) = container.email_sender.outbox
    assert notice.to == "jean.joseph@exemple.test" and notice.subject == "ACME SA — PAM"
    assert notice.body == f"Bonjour Jean,\n\n{NOTICE}\n" and notice.html


def test_ca03_dossier_sans_courriel_utilisable(admin_client, container):
    _hold(container, employee=EMP_E, channel=LoginChannel.WHATSAPP)  # EMP-E n'a pas de courriel dans l'export
    container.email_sender.outbox.clear()

    response = admin_client.post(f"/api/admin/employees/{EMP_E.id}/lift-hold")

    assert response.json() == {"message": "Gel levé. Ce dossier n'a toujours pas d'adresse de courriel utilisable."}
    assert container.email_sender.outbox == []


def test_ca02_sans_gel_et_sans_courriel(admin_client):
    response = admin_client.post(f"/api/admin/employees/{EMP_E.id}/lift-hold")

    assert response.json()["error"]["message"] == (
        "Aucun gel en cours, et ce dossier n'a pas d'adresse de courriel utilisable."
    )
