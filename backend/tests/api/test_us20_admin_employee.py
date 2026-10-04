"""US-20 — Consulter le dossier d'un employé (T-20.1 → T-20.4)."""

from tests.employees import EMP_A, EMP_B, EMP_E, EMP_H1, EMP_I


def url(employee_id: str) -> str:
    return f"/api/admin/employees/{employee_id}"


# --- CA-01 : dossier d'un employé ayant soumis -----------------------------------------


def test_ca01_submitted_update_with_date_and_changes(admin_client, submitted, clock):
    submitted(EMP_A, {"telephone_number": "+50937222222", "address_line_1": "12 rue des Palmiers, Pétion-Ville"})

    response = admin_client.get(url(EMP_A.id))

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "UPDATED"
    assert body["submitted_at"].startswith("2026-10-04T09:00:00")
    assert body["declined"] is False
    assert [(c["field_name"], c["label"], c["old_value"], c["new_value"]) for c in body["changes"]] == [
        ("telephone_number", "Téléphone", "+50937221111", "+50937222222"),
        ("address_line_1", "Adresse", body["changes"][1]["old_value"], "12 rue des Palmiers, Pétion-Ville"),
    ]
    assert body["changes"][1]["old_value"] != "12 rue des Palmiers, Pétion-Ville"


def test_ca01_header_and_informations_show_the_new_values(admin_client, submitted):
    submitted(EMP_A, {"last_name": "JOSEPH-PAUL", "telephone_number": "+50937222222"})

    body = admin_client.get(url(EMP_A.id)).json()

    assert body["id"] == EMP_A.id
    assert body["employee_code"] == "AC-1001"
    assert (body["last_name"], body["first_name"]) == ("JOSEPH-PAUL", "Jean")
    assert body["display_name"] == "JOSEPH-PAUL Jean"
    assert body["previous_name"] == "JOSEPH"
    assert body["telephone_number"] == "+50937222222"
    assert body["agency_code"] == "PV"
    assert body["position"] == "Agent de crédit"
    assert body["birth_date"] == "1996-03-15"
    for name in ("gender", "email_address", "address_line_1", "department", "grade", "level", "contract_nature", "hire_date"):
        assert name in body


# --- CA-02 : brouillon invisible -------------------------------------------------------


def test_ca02_draft_is_never_returned(admin_client, draft):
    draft(EMP_B, {"telephone_number": "+50937999999", "last_name": "BROUILLON"})

    response = admin_client.get(url(EMP_B.id))
    body = response.json()

    assert body["status"] == "NOT_UPDATED"
    assert body["changes"] == []
    assert body["submitted_at"] is None
    assert body["declined"] is False
    assert body["last_name"] == "BAPTISTE"
    assert "+50937999999" not in response.text
    assert "BROUILLON" not in response.text
    assert "DRAFT" not in response.text


def test_no_update_at_all(admin_client):
    body = admin_client.get(url(EMP_E.id)).json()

    assert (body["status"], body["changes"], body["submitted_at"], body["declined"]) == ("NOT_UPDATED", [], None, False)


# --- CA-03 : réponse « Non » -----------------------------------------------------------


def test_ca03_declined_is_reported(admin_client, container):
    container.record_decision().execute(EMP_H1.id, False)

    body = admin_client.get(url(EMP_H1.id)).json()

    assert body["status"] == "NOT_UPDATED"
    assert body["declined"] is True


def test_ca03_no_then_yes_is_no_longer_declined(admin_client, container):
    container.record_decision().execute(EMP_H1.id, False)
    container.record_decision().execute(EMP_H1.id, True)

    assert admin_client.get(url(EMP_H1.id)).json()["declined"] is False


# --- CA-04 : lecture seule -------------------------------------------------------------


def test_ca04_no_write_route_on_admin_employees(app):
    paths = app.openapi()["paths"]

    writes = [
        (method.upper(), path)
        for path, operations in paths.items()
        if path.startswith("/api/admin/employees")
        for method in operations
        if method.lower() in {"post", "put", "patch", "delete"}
    ]
    # Seule exception prévue : la réinitialisation d'accès (US-22).
    assert all(path.endswith("/reset-access") and method == "POST" for method, path in writes), writes


def test_ca04_write_methods_are_refused_and_change_nothing(admin_client):
    before = admin_client.get(url(EMP_A.id)).json()

    for method in ("POST", "PUT", "PATCH", "DELETE"):
        assert admin_client.request(method, url(EMP_A.id), json={"last_name": "X"}).status_code in (404, 405)

    assert admin_client.get(url(EMP_A.id)).json() == before


# --- CA-05 : aucune donnée sensible ----------------------------------------------------


def test_ca05_no_excluded_column(admin_client, submitted, account):
    account(EMP_A)
    submitted(EMP_A, {"telephone_number": "+50937222222"})

    response = admin_client.get(url(EMP_A.id))

    assert "FAKE-SECRET" not in response.text
    assert "password" not in response.text.lower()
    assert "argon2" not in response.text.lower()


# --- CA-06 : employé inconnu ou inactif ------------------------------------------------


def test_ca06_inactive_employee_gives_404(admin_client):
    response = admin_client.get(url(EMP_I.id))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "EMPLOYEE_NOT_FOUND"
    assert "CHARLES" not in response.text


def test_ca06_unknown_employee_gives_404(admin_client):
    assert admin_client.get(url("9999")).status_code == 404
    assert admin_client.get(url("admin")).status_code == 404


# --- CA-07 : état du compte ------------------------------------------------------------


def test_ca07_account_state(admin_client, account):
    account(EMP_A)

    assert admin_client.get(url(EMP_A.id)).json()["account_activated"] is True
    assert admin_client.get(url(EMP_B.id)).json()["account_activated"] is False
