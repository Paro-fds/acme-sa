"""US-01 → US-101 (refonte) — Reconnaître l'employé à la connexion.

Depuis US-101, il n'y a plus d'étape d'identification séparée : l'identité est vérifiée
par `POST /api/auth/login`, sur un seul écran, et l'ancienne route `/api/auth/identify`
(qui disait si une personne existait et avait un mot de passe) est supprimée.
"""

import pytest

from tests.employees import EMP_A, EMP_D1, EMP_E, EMP_H1, EMP_H2, EMP_I

URL = "/api/auth/login"
PASSWORD = "Bonjour-2026"
GENERIC = {
    "code": "INVALID_CREDENTIALS",
    "message": "Ces informations ne correspondent pas. Vérifiez votre nom, votre date de naissance et votre mot de passe.",
}


def _login(client, employee=EMP_A, password=PASSWORD, **identity):
    return client.post(URL, json=employee.identity(password=password, **identity))


def test_identify_route_no_longer_exists(client):
    response = client.post("/api/auth/identify", json=EMP_A.identity())

    assert response.status_code in (404, 405)


def test_ca03_case_accents_and_spaces_are_ignored(client, account):
    account(EMP_E)

    response = _login(client, employee=EMP_E, last_name="etienne", first_name="  rose  ")

    assert response.status_code == 204


def test_ca04_unknown_identity_gets_the_generic_answer(client, account):
    account(EMP_A)

    response = _login(client, birth_date="1996-03-16")

    assert response.status_code == 401
    assert response.json() == {"error": GENERIC}


def test_ca05_inactive_employee_gets_the_same_answer_as_unknown(client):
    unknown = _login(client, last_name="INCONNU")
    inactive = _login(client, employee=EMP_I)

    assert inactive.status_code == unknown.status_code == 401
    assert inactive.json() == unknown.json() == {"error": GENERIC}


def test_ca06_homonyms_are_told_apart_by_birth_date(client, account):
    account(EMP_H1, "Premier-2026")
    account(EMP_H2, "Second-2026")

    assert _login(client, employee=EMP_H1, password="Premier-2026").status_code == 204
    assert _login(client, employee=EMP_H2, password="Second-2026").status_code == 204


def test_ca07_full_duplicate_opens_no_file(client):
    response = _login(client, employee=EMP_D1)

    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "IDENTITY_AMBIGUOUS",
        "message": "Plusieurs dossiers correspondent à vos informations. Contactez l'administration.",
    }
    assert "set-cookie" not in response.headers


def test_ca08_submitted_new_name_and_old_name_are_both_recognized(client, account, submitted):
    account(EMP_A)
    submitted(EMP_A, {"last_name": "JOSEPH-PAUL"})

    assert _login(client, last_name="Joseph-Paul").status_code == 204
    assert _login(client, last_name="JOSEPH").status_code == 204


def test_ca08_draft_name_is_not_used_for_identification(client, account, draft):
    account(EMP_A)
    draft(EMP_A, {"last_name": "JOSEPH-PAUL"})

    response = _login(client, last_name="Joseph-Paul")

    assert response.status_code == 401


@pytest.mark.parametrize("missing", ["last_name", "first_name", "birth_date", "password"])
def test_ca09_every_field_is_required(client, missing):
    payload = EMP_A.identity(password=PASSWORD)
    del payload[missing]

    response = client.post(URL, json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize("blank", ["last_name", "first_name"])
def test_ca09_blank_name_is_rejected(client, blank):
    response = _login(client, **{blank: "   "})

    assert response.status_code == 422
