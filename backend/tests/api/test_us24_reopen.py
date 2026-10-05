"""US-24 — Modifier à nouveau son dossier après l'envoi (T-24.2)."""

import pytest

from tests.employees import EMP_A, EMP_B

UPDATE = "/api/me/update"
PDF = b"%PDF-1.7\n" + b"diplome" * 50


@pytest.fixture
def sent(submitted, employee_client, clock):
    """EMP-A a envoyé le téléphone +509 3722 2222 ; une heure passe."""
    submitted(EMP_A, {"telephone_number": "+50937222222"})
    clock.advance(hours=1)
    return employee_client(EMP_A)


def _reopen(client):
    return client.post(f"{UPDATE}/reopen")


def _admin_folder(admin_client):
    return admin_client.get(f"/api/admin/employees/{EMP_A.id}")


# --- CA-01 : état « envoyée », réouverture possible ------------------------------------


def test_ca01_sent_update_can_be_reopened(sent):
    body = sent.get(UPDATE).json()

    assert body["state"] == "DONE"
    assert body["reopened"] is False
    assert body["submitted_at"].startswith("2026-10-04T09:00:00")


# --- CA-02 : reprise des valeurs envoyées ----------------------------------------------


def test_ca02_reopen_starts_from_the_sent_values(sent):
    response = _reopen(sent)

    assert response.status_code == 200
    body = response.json()
    assert (body["state"], body["reopened"]) == ("IN_PROGRESS", True)
    assert body["submitted_at"].startswith("2026-10-04T09:00:00")
    fields = {field["code"]: field for field in sent.get(f"{UPDATE}/fields").json()}
    assert fields["telephone_number"]["value"] == "+50937222222"
    assert fields["telephone_number"]["original_value"] == "+50937221111"


# --- CA-03 : l'administration ne voit que le dernier envoi -----------------------------


def test_ca03_admin_still_sees_the_last_submission(sent, admin_client):
    before = _admin_folder(admin_client).json()
    _reopen(sent)
    sent.put(f"{UPDATE}/changes", json={"changes": {"telephone_number": "+50937223333"}})

    folder = _admin_folder(admin_client)
    listing = admin_client.get("/api/admin/employees", params={"search": "joseph"})
    statistics = admin_client.get("/api/admin/statistics")

    assert folder.json() == before
    assert folder.json()["status"] == "UPDATED"
    assert folder.json()["telephone_number"] == "+50937222222"
    for response in (folder, listing, statistics):
        assert "+50937223333" not in response.text
    assert listing.json()["items"][0]["status"] == "UPDATED"
    assert statistics.json()["updated"] == 1


def test_ca03_employee_profile_shows_the_sent_values_while_editing(sent):
    _reopen(sent)
    sent.put(f"{UPDATE}/changes", json={"changes": {"telephone_number": "+50937223333"}})

    assert sent.get("/api/me/profile").json()["telephone_number"] == "+50937222222"


# --- CA-04 : nouvel envoi --------------------------------------------------------------


def test_ca04_new_submission_replaces_the_previous_one(sent, admin_client):
    _reopen(sent)
    sent.put(f"{UPDATE}/changes", json={"changes": {"telephone_number": "+50937223333"}})

    response = sent.post(f"{UPDATE}/submit", json={"confirmed": True})

    assert response.status_code == 200
    assert response.json()["state"] == "DONE"
    folder = _admin_folder(admin_client).json()
    assert folder["submitted_at"].startswith("2026-10-04T10:00:00")
    assert [(c["field_name"], c["old_value"], c["new_value"]) for c in folder["changes"]] == [
        ("telephone_number", "+50937221111", "+50937223333")
    ]
    assert sent.get("/api/me/profile").json()["telephone_number"] == "+50937223333"


# --- CA-05 : annuler les modifications -------------------------------------------------


def test_ca05_discard_returns_to_the_sent_version(sent, admin_client):
    before = _admin_folder(admin_client).json()
    _reopen(sent)
    sent.put(f"{UPDATE}/changes", json={"changes": {"telephone_number": "+50937223333"}})

    response = sent.post(f"{UPDATE}/discard")

    assert response.status_code == 200
    body = response.json()
    assert (body["state"], body["reopened"]) == ("DONE", False)
    assert [c["new_value"] for c in body["changes"]] == ["+50937222222"]
    assert _admin_folder(admin_client).json() == before
    assert sent.put(f"{UPDATE}/changes", json={"changes": {"telephone_number": "+50937224444"}}).status_code == 409


def test_ca05_discard_without_a_reopened_update_gives_409(sent):
    response = sent.post(f"{UPDATE}/discard")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "NO_REOPENED_UPDATE"


# --- CA-06 : retour à la valeur d'origine ----------------------------------------------


def test_ca06_value_back_to_the_original_is_no_longer_a_change(sent, admin_client):
    _reopen(sent)
    sent.put(f"{UPDATE}/changes", json={"changes": {"telephone_number": "+50937221111"}})
    sent.post(f"{UPDATE}/submit", json={"confirmed": True})

    folder = _admin_folder(admin_client).json()

    assert folder["changes"] == []
    assert folder["status"] == "UPDATED"
    assert folder["telephone_number"] == "+50937221111"


# --- CA-07 : documents -----------------------------------------------------------------


def test_ca07_documents_are_editable_again_while_reopened(sent):
    upload = {"file": ("diplome.pdf", PDF, "application/pdf")}
    assert sent.post("/api/me/documents", data={"document_type": "DIPLOME"}, files=upload).status_code == 409

    _reopen(sent)
    added = sent.post("/api/me/documents", data={"document_type": "DIPLOME"}, files=upload)
    assert added.status_code == 201
    sent.post(f"{UPDATE}/submit", json={"confirmed": True})

    assert sent.delete(f"/api/me/documents/{added.json()['id']}").status_code == 409


# --- CA-08 : identification ------------------------------------------------------------


def test_ca08_identification_uses_the_last_sent_name(submitted, employee_client, client):
    submitted(EMP_A, {"last_name": "JOSEPH-PAUL"})
    employee = employee_client(EMP_A)
    _reopen(employee)
    employee.put(f"{UPDATE}/changes", json={"changes": {"last_name": "PAUL"}})

    def identify(last_name):
        return client.post("/api/auth/identify", json=EMP_A.identity(last_name=last_name)).status_code

    assert identify("JOSEPH") == 200
    assert identify("JOSEPH-PAUL") == 200
    assert identify("PAUL") == 401


# --- CA-09 : pas de réouverture sans envoi ---------------------------------------------


@pytest.mark.parametrize("prepare", ["rien", "brouillon"])
def test_ca09_reopen_without_a_submission_gives_409(employee_client, draft, prepare):
    if prepare == "brouillon":
        draft(EMP_B, {"telephone_number": "+50937228889"})
    client = employee_client(EMP_B)

    response = _reopen(client)

    assert response.status_code == 409
    assert response.json()["error"]["code"] in {"UPDATE_NOT_SUBMITTED", "UPDATE_NOT_STARTED"}
    assert client.get(UPDATE).json()["state"] in {"NOT_DONE", "IN_PROGRESS"}


def test_reopen_twice_gives_409(sent):
    _reopen(sent)

    assert _reopen(sent).status_code == 409


def test_reopen_and_discard_require_an_employee_session(client, admin_client):
    for path in ("reopen", "discard"):
        assert client.post(f"{UPDATE}/{path}").status_code == 401
        assert admin_client.post(f"{UPDATE}/{path}").status_code == 401
