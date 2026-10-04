"""US-01 — Vérifier son identité."""

import pytest

from tests.employees import EMP_A, EMP_D1, EMP_E, EMP_H1, EMP_H2, EMP_I

URL = "/api/auth/identify"


def test_ca01_recognized_employee_without_password_must_create_one(client):
    response = client.post(URL, json=EMP_A.identity())

    assert response.status_code == 200
    assert response.json() == {"next_step": "CREATE_PASSWORD"}


def test_ca02_recognized_employee_with_password_must_enter_it(client, account):
    account(EMP_A)

    response = client.post(URL, json=EMP_A.identity())

    assert response.json() == {"next_step": "ENTER_PASSWORD"}


def test_ca03_case_accents_and_spaces_are_ignored(client):
    response = client.post(URL, json=EMP_E.identity(last_name="etienne", first_name="  rose  "))

    assert response.status_code == 200
    assert response.json() == {"next_step": "CREATE_PASSWORD"}


def test_ca04_unknown_identity_is_rejected(client):
    response = client.post(URL, json=EMP_A.identity(birth_date="1996-03-16"))

    assert response.status_code == 401
    assert response.json() == {
        "error": {"code": "IDENTITY_NOT_RECOGNIZED", "message": "Informations non reconnues. Vérifiez votre saisie."}
    }


def test_ca05_inactive_employee_gets_the_same_answer_as_unknown(client):
    unknown = client.post(URL, json=EMP_A.identity(last_name="INCONNU"))
    inactive = client.post(URL, json=EMP_I.identity())

    assert inactive.status_code == unknown.status_code == 401
    assert inactive.json() == unknown.json()


def test_ca06_homonyms_are_told_apart_by_birth_date(client, account):
    account(EMP_H2)

    first = client.post(URL, json=EMP_H1.identity())
    second = client.post(URL, json=EMP_H2.identity())

    assert first.json() == {"next_step": "CREATE_PASSWORD"}
    assert second.json() == {"next_step": "ENTER_PASSWORD"}


def test_ca07_full_duplicate_opens_no_file(client):
    response = client.post(URL, json=EMP_D1.identity())

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "IDENTITY_AMBIGUOUS",
        "message": "Plusieurs dossiers correspondent à vos informations. Contactez l'administration.",
    }
    assert "set-cookie" not in response.headers


def test_ca08_submitted_new_name_and_old_name_are_both_recognized(client, submitted):
    submitted(EMP_A, {"last_name": "JOSEPH-PAUL"})

    with_new_name = client.post(URL, json=EMP_A.identity(last_name="Joseph-Paul"))
    with_old_name = client.post(URL, json=EMP_A.identity(last_name="JOSEPH"))

    assert with_new_name.status_code == 200
    assert with_old_name.status_code == 200


def test_ca08_draft_name_is_not_used_for_identification(client, draft):
    draft(EMP_A, {"last_name": "JOSEPH-PAUL"})

    response = client.post(URL, json=EMP_A.identity(last_name="Joseph-Paul"))

    assert response.status_code == 401


@pytest.mark.parametrize("missing", ["last_name", "first_name", "birth_date"])
def test_ca09_every_field_is_required(client, missing):
    payload = EMP_A.identity()
    del payload[missing]

    response = client.post(URL, json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize("blank", ["last_name", "first_name"])
def test_ca09_blank_name_is_rejected(client, blank):
    response = client.post(URL, json=EMP_A.identity(**{blank: "   "}))

    assert response.status_code == 422


def test_ca10_success_exposes_no_employee_data(client):
    response = client.post(URL, json=EMP_A.identity())

    assert response.json() == {"next_step": "CREATE_PASSWORD"}
    assert "set-cookie" not in response.headers
