"""US-22 — Réinitialiser l'accès d'un employé (T-22.1 → T-22.4)."""

from tests.employees import EMP_A, EMP_B, EMP_I

PDF = b"%PDF-1.7\n" + b"contenu du diplome" * 50


def url(employee_id: str) -> str:
    return f"/api/admin/employees/{employee_id}/reset-access"


def _lock(client, employee=EMP_A):
    for _ in range(5):
        client.post("/api/auth/login", json=employee.identity(password="mauvais-mot-de-passe"))


# --- CA-01, CA-02 : réinitialisation, nouvelle création possible -------------------------


def test_ca01_password_is_erased(admin_client, account, container):
    account(EMP_A)

    response = admin_client.post(url(EMP_A.id))

    assert response.status_code == 204
    stored = container.accounts.get(EMP_A.id)
    assert stored.password_hash is None
    assert (stored.failed_attempts, stored.locked_until) == (0, None)
    assert admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()["account_activated"] is False


def test_ca02_identify_then_asks_to_create_a_password(admin_client, account, client):
    account(EMP_A)
    admin_client.post(url(EMP_A.id))

    response = client.post("/api/auth/identify", json=EMP_A.identity())

    assert response.json()["next_step"] == "CREATE_PASSWORD"


def test_ca02_old_password_no_longer_works_and_a_new_one_can_be_created(admin_client, account, client):
    account(EMP_A, "Ancien-mot-2026")
    admin_client.post(url(EMP_A.id))

    assert client.post("/api/auth/login", json=EMP_A.identity(password="Ancien-mot-2026")).status_code != 204
    created = client.post(
        "/api/auth/register",
        json=EMP_A.identity(password="Nouveau-2026", password_confirmation="Nouveau-2026"),
    )
    assert created.status_code == 204


# --- CA-03 : sessions coupées ----------------------------------------------------------


def test_ca03_open_employee_sessions_are_closed(admin_client, account, employee_client):
    account(EMP_A)
    phone = employee_client(EMP_A)
    laptop = employee_client(EMP_A)
    assert phone.get("/api/me/profile").status_code == 200

    admin_client.post(url(EMP_A.id))

    assert phone.get("/api/me/profile").status_code == 401
    assert laptop.get("/api/me/profile").status_code == 401


def test_ca03_other_sessions_are_kept(admin_client, account, employee_client):
    account(EMP_A)
    account(EMP_B)
    other = employee_client(EMP_B)

    admin_client.post(url(EMP_A.id))

    assert other.get("/api/me/profile").status_code == 200
    assert admin_client.get("/api/admin/statistics").status_code == 200


# --- CA-04 : données conservées --------------------------------------------------------


def test_ca04_update_changes_and_documents_are_kept(admin_client, account, container, draft):
    account(EMP_A)
    draft(EMP_A, {"telephone_number": "+50937222222"})
    document = container.upload_document().execute(EMP_A.id, "DIPLOME", "diplome.pdf", PDF)
    container.submit_update().execute(EMP_A.id, True)
    before = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    documents_before = admin_client.get(f"/api/admin/employees/{EMP_A.id}/documents").json()

    admin_client.post(url(EMP_A.id))

    after = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    assert {**after, "account_activated": True} == before
    assert after["status"] == "UPDATED"
    assert after["changes"][0]["new_value"] == "+50937222222"
    assert admin_client.get(f"/api/admin/employees/{EMP_A.id}/documents").json() == documents_before
    assert admin_client.get(f"/api/admin/documents/{document.id}/file").content == PDF


def test_ca04_draft_is_kept(admin_client, account, container, draft):
    account(EMP_A)
    draft(EMP_A, {"telephone_number": "+50937222222"})

    admin_client.post(url(EMP_A.id))

    update = container.updates.get_for_employee(EMP_A.id)
    assert not update.is_submitted
    assert update.accepted
    assert any(change.new_value == "+50937222222" for change in update.changes.values())


# --- CA-05 : déblocage -----------------------------------------------------------------


def test_ca05_locked_account_can_immediately_create_a_new_password(admin_client, account, client, container):
    account(EMP_A)
    _lock(client)
    assert container.accounts.get(EMP_A.id).locked_until is not None

    admin_client.post(url(EMP_A.id))

    assert client.post("/api/auth/identify", json=EMP_A.identity()).json()["next_step"] == "CREATE_PASSWORD"
    created = client.post(
        "/api/auth/register",
        json=EMP_A.identity(password="Nouveau-2026", password_confirmation="Nouveau-2026"),
    )
    assert created.status_code == 204
    assert client.get("/api/me/profile").status_code == 200


# --- CA-06 : compte non activé ---------------------------------------------------------


def test_ca06_employee_without_account_gives_409(admin_client, container):
    response = admin_client.post(url(EMP_B.id))

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ACCOUNT_NOT_ACTIVATED"
    assert container.accounts.get(EMP_B.id) is None


def test_ca06_reset_twice_gives_409_the_second_time(admin_client, account):
    account(EMP_A)

    assert admin_client.post(url(EMP_A.id)).status_code == 204
    assert admin_client.post(url(EMP_A.id)).json()["error"]["code"] == "ACCOUNT_NOT_ACTIVATED"


# --- Sécurité --------------------------------------------------------------------------


def test_unknown_inactive_or_admin_id_gives_404(admin_client, container):
    # Seuls les employés actifs du CSV sont concernés : jamais un compte administrateur (US-23).
    admin = container.admin_accounts.find_by_username("admin")

    for employee_id in (EMP_I.id, "9999", "admin", admin.id):
        response = admin_client.post(url(employee_id))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "EMPLOYEE_NOT_FOUND"
    assert container.admin_accounts.get(admin.id) == admin


def test_reset_requires_an_admin_session(account, client, employee_client, container):
    account(EMP_A)

    assert client.post(url(EMP_A.id)).status_code == 401
    assert employee_client(EMP_A).post(url(EMP_A.id)).status_code == 403
    assert container.accounts.get(EMP_A.id).has_password


def test_response_never_contains_the_password_hash(admin_client, account):
    account(EMP_A)

    response = admin_client.post(url(EMP_A.id))

    assert "argon2" not in response.text.lower()
