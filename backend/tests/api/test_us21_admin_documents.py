"""US-21 — Consulter les documents d'un employé (T-21.1 → T-21.3)."""

from urllib.parse import quote

import pytest

from tests.employees import EMP_A, EMP_B, EMP_I

PDF = b"%PDF-1.7\n" + b"contenu du diplome" * 50
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"pixels" * 100


def list_url(employee_id: str) -> str:
    return f"/api/admin/employees/{employee_id}/documents"


def file_url(document_id: str) -> str:
    return f"/api/admin/documents/{document_id}/file"


@pytest.fixture
def documents_of_a(container, draft, clock):
    """EMP-A avec un diplôme PDF puis, une minute plus tard, un certificat JPG."""
    draft(EMP_A)
    upload = container.upload_document()
    diploma = upload.execute(EMP_A.id, "DIPLOME", "Diplôme licence.pdf", PDF)
    clock.advance(minutes=1)
    certificate = upload.execute(EMP_A.id, "CERTIFICAT", "certificat.jpg", JPEG)
    return diploma, certificate


# --- CA-01 : liste ---------------------------------------------------------------------


def test_ca01_documents_are_listed_with_type_name_date_and_size(admin_client, documents_of_a):
    diploma, certificate = documents_of_a

    response = admin_client.get(list_url(EMP_A.id))

    assert response.status_code == 200
    listed = response.json()
    assert [(d["id"], d["type_label"], d["original_name"], d["content_type"], d["size_bytes"]) for d in listed] == [
        (diploma.id, "Diplôme", "Diplôme licence.pdf", "application/pdf", len(PDF)),
        (certificate.id, "Certificat", "certificat.jpg", "image/jpeg", len(JPEG)),
    ]
    assert listed[0]["uploaded_at"].startswith("2026-10-04T09:00:00")
    assert listed[1]["uploaded_at"].startswith("2026-10-04T09:01:00")


def test_ca01_list_does_not_expose_storage_details(admin_client, documents_of_a):
    for document in admin_client.get(list_url(EMP_A.id)).json():
        assert "stored_name" not in document
        assert "employee_id" not in document


def test_ca01_documents_stay_listed_after_submission(admin_client, documents_of_a, container):
    container.submit_update().execute(EMP_A.id, True)

    assert len(admin_client.get(list_url(EMP_A.id)).json()) == 2


def test_list_of_an_inactive_or_unknown_employee_gives_404(admin_client):
    for employee_id in (EMP_I.id, "9999", "admin"):
        response = admin_client.get(list_url(employee_id))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "EMPLOYEE_NOT_FOUND"


# --- CA-02 : ouverture -----------------------------------------------------------------


def test_ca02_pdf_is_served_with_its_content_type(admin_client, documents_of_a):
    diploma, _ = documents_of_a

    response = admin_client.get(file_url(diploma.id))

    assert response.status_code == 200
    assert response.content == PDF
    assert response.headers["content-type"] == "application/pdf"
    disposition = response.headers["content-disposition"]
    assert disposition.startswith("inline;")
    assert f"filename*=UTF-8''{quote('Diplôme licence.pdf')}" in disposition
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "no-store" in response.headers["cache-control"]


def test_ca02_image_is_served_with_its_content_type(admin_client, documents_of_a):
    _, certificate = documents_of_a

    response = admin_client.get(file_url(certificate.id))

    assert response.content == JPEG
    assert response.headers["content-type"] == "image/jpeg"


# --- CA-03 : aucun document ------------------------------------------------------------


def test_ca03_no_document_gives_an_empty_list(admin_client):
    response = admin_client.get(list_url(EMP_B.id))

    assert response.status_code == 200
    assert response.json() == []


# --- CA-04 : accès réservé à l'administrateur ------------------------------------------


def test_ca04_file_without_session_gives_401(documents_of_a, client):
    diploma, _ = documents_of_a

    response = client.get(file_url(diploma.id))

    assert response.status_code == 401
    assert PDF not in response.content


def test_ca04_file_with_an_employee_session_gives_403(documents_of_a, employee_client):
    diploma, _ = documents_of_a

    # Même l'employé propriétaire du document passe par /api/me/documents, jamais par la route admin.
    response = employee_client(EMP_A).get(file_url(diploma.id))

    assert response.status_code == 403
    assert PDF not in response.content


def test_ca04_list_requires_an_admin_session(documents_of_a, client, employee_client):
    assert client.get(list_url(EMP_A.id)).status_code == 401
    assert employee_client(EMP_A).get(list_url(EMP_A.id)).status_code == 403


# --- CA-05 : document inexistant -------------------------------------------------------


def test_ca05_unknown_document_gives_404(admin_client):
    response = admin_client.get(file_url("inconnu"))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"


def test_ca05_missing_file_on_disk_gives_404(admin_client, documents_of_a, container):
    diploma, _ = documents_of_a
    container.file_storage.delete(f"{EMP_A.id}/{diploma.id}.pdf")

    assert admin_client.get(file_url(diploma.id)).status_code == 404


# --- CA-06 : lecture seule -------------------------------------------------------------


def test_ca06_no_write_route_on_admin_documents(app):
    paths = app.openapi()["paths"]

    writes = [
        (method.upper(), path)
        for path, operations in paths.items()
        if path.startswith("/api/admin") and "/documents" in path
        for method in operations
        if method.lower() in {"post", "put", "patch", "delete"}
    ]
    assert writes == []


def test_ca06_delete_is_refused_and_changes_nothing(admin_client, documents_of_a):
    diploma, _ = documents_of_a

    assert admin_client.delete(file_url(diploma.id)).status_code in (404, 405)
    assert admin_client.request("DELETE", f"/api/admin/documents/{diploma.id}").status_code in (404, 405)
    assert admin_client.post(list_url(EMP_A.id), files={"file": ("x.pdf", PDF)}).status_code in (404, 405)

    assert len(admin_client.get(list_url(EMP_A.id)).json()) == 2
    assert admin_client.get(file_url(diploma.id)).content == PDF
