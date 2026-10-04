"""US-07 — Consulter ses documents (T-07.1 → T-07.4)."""

from urllib.parse import quote

import pytest

from tests.employees import EMP_A, EMP_B

URL = "/api/me/documents"
PDF = b"%PDF-1.7\n" + b"contenu du diplome" * 50
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"pixels" * 100


def _upload(client, name, content, document_type, content_type):
    response = client.post(URL, data={"document_type": document_type}, files={"file": (name, content, content_type)})
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def documents_of_a(employee_client, draft, clock):
    draft(EMP_A)
    client = employee_client(EMP_A)
    diploma = _upload(client, "Diplôme licence.pdf", PDF, "DIPLOME", "application/pdf")
    clock.advance(minutes=1)
    certificate = _upload(client, "certificat.jpg", JPEG, "CERTIFICAT", "image/jpeg")
    return client, diploma, certificate


# --- CA-01, CA-02 : liste ----------------------------------------------------------


def test_ca01_documents_are_listed_with_type_name_date_and_size(documents_of_a):
    client, diploma, certificate = documents_of_a

    listed = client.get(URL).json()

    assert [(d["document_type"], d["type_label"], d["original_name"], d["size_bytes"]) for d in listed] == [
        ("DIPLOME", "Diplôme", "Diplôme licence.pdf", len(PDF)),
        ("CERTIFICAT", "Certificat", "certificat.jpg", len(JPEG)),
    ]
    assert listed[0]["uploaded_at"].startswith("2026-10-04T09:00:00")
    assert listed[1]["uploaded_at"].startswith("2026-10-04T09:01:00")


def test_ca01_documents_stay_visible_after_submission(documents_of_a, container):
    client, diploma, _ = documents_of_a
    container.submit_update().execute(EMP_A.id, True)

    assert len(client.get(URL).json()) == 2
    assert client.get(f"{URL}/{diploma['id']}/file").status_code == 200


def test_ca02_no_document_gives_an_empty_list(employee_client):
    response = employee_client(EMP_B).get(URL)

    assert response.status_code == 200
    assert response.json() == []


def test_list_does_not_expose_storage_details(documents_of_a):
    client, _, _ = documents_of_a

    for document in client.get(URL).json():
        assert "stored_name" not in document
        assert "employee_id" not in document


# --- CA-03 : ouverture -------------------------------------------------------------


def test_ca03_pdf_is_served_with_its_content_type(documents_of_a):
    client, diploma, _ = documents_of_a

    response = client.get(f"{URL}/{diploma['id']}/file")

    assert response.status_code == 200
    assert response.content == PDF
    assert response.headers["content-type"] == "application/pdf"
    disposition = response.headers["content-disposition"]
    assert disposition.startswith("inline;")
    assert f"filename*=UTF-8''{quote('Diplôme licence.pdf')}" in disposition
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in response.headers["cache-control"]


def test_ca03_image_is_served_with_its_content_type(documents_of_a):
    client, _, certificate = documents_of_a

    response = client.get(f"{URL}/{certificate['id']}/file")

    assert response.content == JPEG
    assert response.headers["content-type"] == "image/jpeg"


# --- CA-04, CA-05 : isolation et session ----------------------------------------------


def test_ca04_document_of_another_employee_gives_404(documents_of_a, employee_client):
    _, diploma, _ = documents_of_a

    response = employee_client(EMP_B).get(f"{URL}/{diploma['id']}/file")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"
    assert PDF not in response.content


def test_unknown_document_gives_404(employee_client):
    assert employee_client(EMP_A).get(f"{URL}/inconnu/file").status_code == 404


def test_ca05_file_requires_a_session(documents_of_a, client):
    _, diploma, _ = documents_of_a
    client.cookies.clear()

    response = client.get(f"{URL}/{diploma['id']}/file")

    assert response.status_code == 401
    assert PDF not in response.content


def test_ca05_admin_session_cannot_use_the_employee_route(documents_of_a, admin_client):
    _, diploma, _ = documents_of_a

    response = admin_client.get(f"{URL}/{diploma['id']}/file")

    assert response.status_code == 401
    assert PDF not in response.content
