"""US-22, devenue « Débloquer l'accès » avec US-1003 : plus de mot de passe à effacer, le bouton lève le
verrouillage et ferme les sessions de l'employé ; le dossier n'est pas touché."""

from tests.conftest import employee_login
from tests.employees import EMP_A, EMP_B, EMP_I

PDF = b"%PDF-1.7\n" + b"contenu du diplome" * 50


def url(employee_id: str) -> str:
    return f"/api/admin/employees/{employee_id}/reset-access"


def _lock(client, employee=EMP_A):
    for _ in range(5):
        client.post("/api/auth/identify", json={"employee_code": employee.employee_code, "birth_date": "01011900"})


# --- CA-01, CA-02 : verrouillage levé, l'employé se reconnecte tout de suite ---------------


def test_ca01_le_verrouillage_est_leve(admin_client, client, container):
    _lock(client)
    assert container.login_locks.get("code#AC-1001").locked_until is not None

    response = admin_client.post(url(EMP_A.id))

    assert response.status_code == 204
    stored = container.login_locks.get("code#AC-1001")
    assert (stored.failures, stored.locked_until) == (0, None)
    assert admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()["access_locked"] is False


def test_ca02_l_employe_se_reconnecte_tout_de_suite(admin_client, client, other_ip_client):
    _lock(client)

    admin_client.post(url(EMP_A.id))

    # US-1015 : le verrou de l'adresse IP des essais n'est pas levé ; depuis un autre appareil, l'accès est rouvert.
    employee_login(other_ip_client, EMP_A)
    assert other_ip_client.get("/api/me/profile").status_code == 200


# --- CA-03 : sessions coupées ----------------------------------------------------------


def test_ca03_open_employee_sessions_are_closed(admin_client, employee_client):
    phone = employee_client(EMP_A)
    laptop = employee_client(EMP_A)
    assert phone.get("/api/me/profile").status_code == 200

    admin_client.post(url(EMP_A.id))

    assert phone.get("/api/me/profile").status_code == 401
    assert laptop.get("/api/me/profile").status_code == 401


def test_ca03_une_identification_en_cours_est_fermee_aussi(admin_client, client):
    client.post("/api/auth/identify", json={"employee_code": EMP_A.employee_code, "birth_date": EMP_A.typed_birth_date})

    admin_client.post(url(EMP_A.id))

    assert client.post("/api/auth/code", json={"channel": "EMAIL"}).status_code == 401


def test_ca03_other_sessions_are_kept(admin_client, employee_client):
    other = employee_client(EMP_B)

    admin_client.post(url(EMP_A.id))

    assert other.get("/api/me/profile").status_code == 200
    assert admin_client.get("/api/admin/statistics").status_code == 200


# --- CA-04 : données conservées --------------------------------------------------------


def test_ca04_update_changes_and_documents_are_kept(admin_client, container, draft):
    draft(EMP_A, {"telephone_number": "+50937222222"})
    document = container.upload_document().execute(EMP_A.id, "DIPLOME", "diplome.pdf", PDF)
    container.submit_update().execute(EMP_A.id, True)
    before = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    documents_before = admin_client.get(f"/api/admin/employees/{EMP_A.id}/documents").json()

    admin_client.post(url(EMP_A.id))

    after = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    assert after == before
    assert after["status"] == "UPDATED"
    assert after["changes"][0]["new_value"] == "+50937222222"
    assert admin_client.get(f"/api/admin/employees/{EMP_A.id}/documents").json() == documents_before
    assert admin_client.get(f"/api/admin/documents/{document.id}/file").content == PDF


def test_ca04_draft_is_kept(admin_client, container, draft):
    draft(EMP_A, {"telephone_number": "+50937222222"})

    admin_client.post(url(EMP_A.id))

    update = container.updates.get_for_employee(EMP_A.id)
    assert not update.is_submitted
    assert update.accepted
    assert any(change.new_value == "+50937222222" for change in update.changes.values())


# --- CA-05 : employé jamais connecté ou déjà débloqué -----------------------------------


def test_ca05_debloquer_un_employe_jamais_connecte(admin_client, container):
    assert admin_client.post(url(EMP_B.id)).status_code == 204
    assert container.accounts.get(EMP_B.id) is None


def test_ca05_debloquer_deux_fois(admin_client, client):
    _lock(client)

    assert admin_client.post(url(EMP_A.id)).status_code == 204
    assert admin_client.post(url(EMP_A.id)).status_code == 204


# --- Sécurité --------------------------------------------------------------------------


def test_unknown_inactive_or_admin_id_gives_404(admin_client, container):
    # Seuls les employés actifs de Vault sont concernés : jamais un compte administrateur (US-23).
    admin = container.admin_accounts.find_by_username("admin")

    for employee_id in (EMP_I.id, "9999", "admin", admin.id):
        response = admin_client.post(url(employee_id))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "EMPLOYEE_NOT_FOUND"
    assert container.admin_accounts.get(admin.id) == admin


def test_reset_requires_an_admin_session(client, employee_client, container):
    _lock(client)

    assert client.post(url(EMP_A.id)).status_code == 401
    assert employee_client(EMP_B).post(url(EMP_A.id)).status_code == 403
    assert container.login_locks.get("code#AC-1001").locked_until is not None


def test_le_deblocage_est_trace(admin_client, container):
    admin_client.post(url(EMP_A.id))

    entries = [entry for entry in container.audit_logs.list_all() if entry.target_id == EMP_A.employee_code]
    assert [entry.details for entry in entries] == ["Accès débloqué"]
