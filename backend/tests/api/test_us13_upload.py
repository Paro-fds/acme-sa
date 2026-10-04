"""US-13 — Ajouter un document (T-13.3, T-13.4)."""

import re

import pytest

from tests.employees import EMP_A, EMP_B

URL = "/api/me/documents"
PDF = b"%PDF-1.7\n" + b"0" * 1024
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"1" * 2048
PNG = b"\x89PNG\r\n\x1a\n" + b"2" * 512
MB = 1024 * 1024


def _upload(client, name="diplome.pdf", content=PDF, document_type="DIPLOME", content_type="application/pdf"):
    data = {} if document_type is None else {"document_type": document_type}
    return client.post(URL, data=data, files={"file": (name, content, content_type)})


def _stored_files(settings, employee=EMP_A):
    folder = settings.documents_dir / employee.id
    return sorted(folder.iterdir()) if folder.exists() else []


# --- CA-01, CA-03, CA-10 : enregistrement ---------------------------------------


def test_ca01_pdf_is_recorded_and_listed(employee_client, draft, clock):
    draft(EMP_A)
    client = employee_client(EMP_A)
    content = b"%PDF-1.7\n" + b"x" * MB

    response = _upload(client, content=content)

    assert response.status_code == 201
    document = response.json()
    assert document == {
        "id": document["id"],
        "document_type": "DIPLOME",
        "type_label": "Diplôme",
        "original_name": "diplome.pdf",
        "content_type": "application/pdf",
        "size_bytes": len(content),
        "uploaded_at": document["uploaded_at"],
    }
    assert document["uploaded_at"].startswith("2026-10-04T09:00:00")
    assert client.get(URL).json() == [document]


def test_ca03_several_documents_are_listed_in_upload_order(employee_client, draft, clock):
    draft(EMP_A)
    client = employee_client(EMP_A)

    _upload(client, "licence.pdf", PDF, "DIPLOME")
    clock.advance(minutes=1)
    _upload(client, "certificat.jpg", JPEG, "CERTIFICAT", "image/jpeg")
    clock.advance(minutes=1)
    _upload(client, "attestation.png", PNG, "ATTESTATION", "image/png")

    listed = client.get(URL).json()
    assert [(d["original_name"], d["type_label"], d["content_type"]) for d in listed] == [
        ("licence.pdf", "Diplôme", "application/pdf"),
        ("certificat.jpg", "Certificat", "image/jpeg"),
        ("attestation.png", "Attestation", "image/png"),
    ]


@pytest.mark.parametrize(("document_type", "label"), [("DIPLOME", "Diplôme"), ("CERTIFICAT", "Certificat"), ("ATTESTATION", "Attestation"), ("AUTRE", "Autre")])
def test_ca01_every_document_type_is_accepted(employee_client, draft, document_type, label):
    draft(EMP_A)

    response = _upload(employee_client(EMP_A), document_type=document_type)

    assert response.status_code == 201
    assert response.json()["type_label"] == label


def test_ca10_file_is_stored_under_a_uuid_name_in_the_employee_folder(employee_client, draft, settings, container):
    draft(EMP_A)

    document = _upload(employee_client(EMP_A), name="Mon diplôme (copie).pdf").json()

    [stored] = _stored_files(settings)
    assert re.fullmatch(r"[0-9a-f]{32}\.pdf", stored.name)
    assert stored.read_bytes() == PDF
    row = container.documents.get(document["id"])
    assert (row.employee_id, row.stored_name, row.original_name) == (EMP_A.id, stored.name, "Mon diplôme (copie).pdf")


def test_ca10_original_name_cannot_choose_the_location_on_disk(employee_client, draft, settings):
    draft(EMP_A)

    response = _upload(employee_client(EMP_A), name="../../evil.pdf")

    assert response.status_code == 201
    assert response.json()["original_name"] == "evil.pdf"
    assert len(_stored_files(settings)) == 1
    assert not (settings.acme_data_dir / "evil.pdf").exists()


def test_documents_of_another_employee_are_not_listed(employee_client, draft):
    draft(EMP_A)
    _upload(employee_client(EMP_A))

    assert employee_client(EMP_B).get(URL).json() == []


# --- CA-04, CA-05, CA-06, CA-07 : refus, sans aucun fichier écrit ----------------


@pytest.mark.parametrize(
    ("name", "content", "content_type"),
    [
        ("cv.docx", b"PK\x03\x04" + b"0" * 100, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("virus.pdf", b"MZ\x90\x00" + b"0" * 100, "application/pdf"),
        ("photo.png", JPEG, "image/png"),
    ],
)
def test_ca04_unsupported_file_is_refused(employee_client, draft, settings, name, content, content_type):
    draft(EMP_A)

    response = _upload(employee_client(EMP_A), name=name, content=content, content_type=content_type)

    assert response.status_code == 415
    assert response.json()["error"] == {
        "code": "UNSUPPORTED_FILE_TYPE",
        "message": "Format non accepté. Utilisez un PDF, JPG ou PNG.",
        "field": "file",
    }
    assert _stored_files(settings) == []


def test_ca05_file_over_5_mb_is_refused(employee_client, draft, settings):
    draft(EMP_A)

    response = _upload(employee_client(EMP_A), content=b"%PDF-1.7\n" + b"0" * (6 * MB))

    assert response.status_code == 413
    assert response.json()["error"] == {
        "code": "FILE_TOO_LARGE",
        "message": "Fichier trop volumineux (5 Mo maximum).",
        "field": "file",
    }
    assert _stored_files(settings) == []


def test_ca05_file_of_exactly_5_mb_is_accepted(employee_client, draft):
    draft(EMP_A)
    content = b"%PDF-1.7\n" + b"0" * (5 * MB - 9)

    assert _upload(employee_client(EMP_A), content=content).status_code == 201


def test_ca06_eleventh_document_is_refused(employee_client, draft, settings):
    draft(EMP_A)
    client = employee_client(EMP_A)
    for index in range(10):
        assert _upload(client, name=f"doc{index}.pdf").status_code == 201

    response = _upload(client, name="onzieme.pdf")

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "DOCUMENT_LIMIT_REACHED",
        "message": "Nombre maximum de documents atteint (10).",
    }
    assert len(_stored_files(settings)) == 10
    assert len(client.get(URL).json()) == 10


@pytest.mark.parametrize("document_type", [None, "", "PASSEPORT"])
def test_ca07_document_type_is_required(employee_client, draft, settings, document_type):
    draft(EMP_A)

    response = _upload(employee_client(EMP_A), document_type=document_type)

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "document_type"
    assert _stored_files(settings) == []


def test_ca07_file_is_required(employee_client, draft):
    draft(EMP_A)

    response = employee_client(EMP_A).post(URL, data={"document_type": "DIPLOME"})

    assert response.status_code == 422


# --- Mise à jour non ouverte ou soumise (D-04, US-12 CA-04) ----------------------


def test_upload_requires_an_open_update(employee_client, settings):
    response = _upload(employee_client(EMP_A))

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_NOT_STARTED"
    assert _stored_files(settings) == []


def test_upload_is_refused_after_submission(employee_client, submitted, settings):
    submitted(EMP_A)

    response = _upload(employee_client(EMP_A))

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "UPDATE_ALREADY_SUBMITTED"
    assert _stored_files(settings) == []


def test_documents_require_a_session(client):
    assert client.get(URL).status_code == 401
    assert _upload(client).status_code == 401
