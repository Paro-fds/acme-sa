"""US-14 — Supprimer un document (T-14.1, T-14.2)."""

import pytest

from tests.employees import EMP_A, EMP_B

URL = "/api/me/documents"
PDF = b"%PDF-1.7\n" + b"0" * 1024


def _upload(client, name="diplome.pdf"):
    response = client.post(URL, data={"document_type": "DIPLOME"}, files={"file": (name, PDF, "application/pdf")})
    assert response.status_code == 201
    return response.json()


def _stored_file(settings, container, document_id):
    document = container.documents.get(document_id)
    return settings.documents_dir / document.employee_id / document.stored_name


def test_ca01_row_and_file_are_deleted(employee_client, draft, container, settings):
    draft(EMP_A)
    client = employee_client(EMP_A)
    document = _upload(client)
    path = _stored_file(settings, container, document["id"])
    assert path.exists()

    response = client.delete(f"{URL}/{document['id']}")

    assert response.status_code == 204
    assert container.documents.get(document["id"]) is None
    assert not path.exists()
    assert client.get(URL).json() == []


def test_ca01_only_the_chosen_document_is_deleted(employee_client, draft, container, settings):
    draft(EMP_A)
    client = employee_client(EMP_A)
    kept = _upload(client, "garde.pdf")
    removed = _upload(client, "supprime.pdf")

    client.delete(f"{URL}/{removed['id']}")

    assert [d["id"] for d in client.get(URL).json()] == [kept["id"]]
    assert _stored_file(settings, container, kept["id"]).exists()


def test_deleting_frees_a_place_under_the_limit(employee_client, draft):
    draft(EMP_A)
    client = employee_client(EMP_A)
    documents = [_upload(client, f"doc{index}.pdf") for index in range(10)]

    client.delete(f"{URL}/{documents[0]['id']}")

    assert client.post(URL, data={"document_type": "AUTRE"}, files={"file": ("nouveau.pdf", PDF, "application/pdf")}).status_code == 201


def test_ca03_deletion_is_refused_after_submission(employee_client, draft, container, settings):
    draft(EMP_A)
    client = employee_client(EMP_A)
    document = _upload(client)
    container.submit_update().execute(EMP_A.id, True)

    response = client.delete(f"{URL}/{document['id']}")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_ALREADY_SUBMITTED"
    assert container.documents.get(document["id"]) is not None
    assert _stored_file(settings, container, document["id"]).exists()


def test_ca04_document_of_another_employee_cannot_be_deleted(employee_client, draft, container, settings):
    draft(EMP_B)
    document_of_b = _upload(employee_client(EMP_B))
    draft(EMP_A)

    response = employee_client(EMP_A).delete(f"{URL}/{document_of_b['id']}")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"
    assert container.documents.get(document_of_b["id"]) is not None
    assert _stored_file(settings, container, document_of_b["id"]).exists()


@pytest.mark.parametrize("document_id", ["inconnu", "0" * 32])
def test_unknown_document_gives_404(employee_client, draft, document_id):
    draft(EMP_A)

    response = employee_client(EMP_A).delete(f"{URL}/{document_id}")

    assert response.status_code == 404


def test_deletion_requires_a_session(client):
    assert client.delete(f"{URL}/abc").status_code == 401
