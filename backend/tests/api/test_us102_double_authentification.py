"""US-102 — Choisir ma double authentification (comptes RH)."""

import json
import logging
from collections.abc import Iterator

import pyotp
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A
from tests.fake_clock import FakeClock

LOGIN = "/api/admin/auth/login"
MFA = "/api/admin/auth/mfa"
SETUP = "/api/admin/auth/mfa/setup"
SETUP_CONFIRM = "/api/admin/auth/mfa/setup/confirm"
RESEND = "/api/admin/auth/mfa/code"
VERIFY = "/api/admin/auth/mfa/verify"
RH_PAGE = "/api/admin/employees"
PHONE = "+509 3722 1111"


@pytest.fixture
def mfa_app(settings: Settings) -> Iterator[FastAPI]:
    application = create_app(settings.model_copy(update={"admin_mfa_required": True}))
    application.state.container.clock = FakeClock()
    yield application
    application.state.container.close()


@pytest.fixture
def mfa_container(mfa_app):
    return mfa_app.state.container


@pytest.fixture
def rh(mfa_app) -> Iterator[TestClient]:
    with TestClient(mfa_app) as client:
        yield client


@pytest.fixture
def security_events(caplog) -> list[dict]:
    caplog.set_level(logging.INFO, logger="acme.security")
    events: list[dict] = []

    class Collector(logging.Handler):
        def emit(self, record):
            try:
                events.append(json.loads(record.getMessage()))
            except ValueError:
                pass

    handler = Collector()
    logging.getLogger("acme.security").addHandler(handler)
    yield events
    logging.getLogger("acme.security").removeHandler(handler)


def login(client, username=ADMIN_USERNAME, password=ADMIN_PASSWORD):
    return client.post(LOGIN, json={"username": username, "password": password})


def totp_code(container, secret: str, **offset) -> str:
    return pyotp.TOTP(secret).at(container.clock.now())


def enroll_whatsapp(client) -> None:
    login(client)
    code = client.post(SETUP, json={"method": "WHATSAPP", "destination": PHONE}).json()["code"]["demo_code"]
    assert client.post(SETUP_CONFIRM, json={"code": code}).status_code == 204


def enroll_totp(client, container) -> str:
    login(client)
    secret = client.post(SETUP, json={"method": "TOTP"}).json()["totp"]["secret"]
    assert client.post(SETUP_CONFIRM, json={"code": totp_code(container, secret)}).status_code == 204
    return secret


# --- CA-01 : une méthode avant d'entrer dans l'espace RH ---------------------------------


def test_ca01_le_mot_de_passe_seul_n_ouvre_pas_l_espace_rh(rh):
    response = login(rh)

    assert response.status_code == 202
    assert response.json() == {"mfa": {"enrolled": False, "method": None, "destination": None}, "code": None}
    refused = rh.get(RH_PAGE)
    assert refused.status_code == 401
    assert refused.json()["error"]["code"] == "MFA_REQUIRED"


def test_ca01_premiere_connexion_choisir_puis_confirmer_ouvre_l_espace_rh(rh, mfa_container):
    enroll_whatsapp(rh)

    assert rh.get(RH_PAGE).status_code == 200
    admin = mfa_container.admin_accounts.find_by_username(ADMIN_USERNAME)
    assert (admin.mfa_method, admin.mfa_destination) == ("WHATSAPP", "+50937221111")


def test_ca01_la_methode_n_est_enregistree_qu_apres_un_code_confirme(rh, mfa_container):
    login(rh)
    rh.post(SETUP, json={"method": "EMAIL", "destination": "rh@exemple.test"})

    assert rh.post(SETUP_CONFIRM, json={"code": "000000"}).status_code == 422
    assert not mfa_container.admin_accounts.find_by_username(ADMIN_USERNAME).mfa_enrolled
    assert rh.get(RH_PAGE).status_code == 401


def test_ca01_une_methode_enregistree_ne_se_remplace_pas_a_la_connexion(rh):
    enroll_whatsapp(rh)
    rh.cookies.clear()
    login(rh)

    response = rh.post(SETUP, json={"method": "EMAIL", "destination": "pirate@exemple.test"})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "MFA_ALREADY_ENROLLED"


@pytest.mark.parametrize(
    ("method", "destination"),
    [("EMAIL", "pas-une-adresse"), ("WHATSAPP", "3722 1111"), ("WHATSAPP", "")],
)
def test_ca01_une_destination_invalide_est_refusee_pres_du_champ(rh, method, destination):
    login(rh)

    response = rh.post(SETUP, json={"method": method, "destination": destination})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_DESTINATION"
    assert response.json()["error"]["field"] == "destination"


# --- CA-02 : code à 6 chiffres par WhatsApp ou email ---------------------------------------


def test_ca02_a_la_connexion_suivante_le_code_part_vers_la_methode_enregistree(rh):
    enroll_whatsapp(rh)
    rh.cookies.clear()

    response = login(rh)

    assert response.status_code == 202
    body = response.json()
    assert body["mfa"] == {"enrolled": True, "method": "WHATSAPP", "destination": "+509 •••• 1111"}
    code = body["code"]["demo_code"]
    assert len(code) == 6 and code.isdigit()
    assert rh.post(VERIFY, json={"code": code}).status_code == 204
    assert rh.get(RH_PAGE).status_code == 200


def test_ca02_le_code_est_a_usage_unique(rh):
    enroll_whatsapp(rh)
    rh.cookies.clear()
    code = login(rh).json()["code"]["demo_code"]
    rh.post(VERIFY, json={"code": code})
    rh.cookies.clear()
    login(rh)

    assert rh.post(VERIFY, json={"code": code}).status_code in (422, 401)


def test_ca02_le_code_expire_apres_5_minutes(rh, mfa_container):
    enroll_whatsapp(rh)
    rh.cookies.clear()
    code = login(rh).json()["code"]["demo_code"]

    mfa_container.clock.advance(minutes=5)
    response = rh.post(VERIFY, json={"code": code})

    assert response.status_code == 422
    assert response.json()["error"] == {
        "code": "INVALID_CODE",
        "message": "Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.",
        "field": "code",
    }


def test_ca02_un_nouveau_code_remplace_le_precedent(rh):
    enroll_whatsapp(rh)
    rh.cookies.clear()
    first = login(rh).json()["code"]["demo_code"]

    second = rh.post(RESEND).json()

    assert second["destination"] == "+509 •••• 1111"
    if second["demo_code"] != first:
        assert rh.post(VERIFY, json={"code": first}).status_code == 422
    assert rh.post(VERIFY, json={"code": second["demo_code"]}).status_code == 204


def test_ca02_email_adresse_masquee(rh):
    login(rh)

    body = rh.post(SETUP, json={"method": "EMAIL", "destination": "Rh.Demo@Exemple.test"}).json()

    assert body["code"]["destination"] == "r•••@exemple.test"


def test_ca02_cinq_codes_faux_suspendent_le_compte(rh):
    enroll_whatsapp(rh)
    rh.cookies.clear()
    login(rh)

    for _ in range(4):
        assert rh.post(VERIFY, json={"code": "000000"}).status_code == 422
    response = rh.post(VERIFY, json={"code": "000000"})

    assert response.status_code == 423
    assert response.json()["error"]["retry_after"] == 900


def test_ca02_en_production_le_code_n_est_jamais_renvoye_par_l_api(settings):
    production = settings.model_copy(update={"admin_mfa_required": True, "app_env": "production"})
    assert not production.shows_demo_codes


# --- CA-03 : application d'authentification (TOTP) -----------------------------------------


def test_ca03_l_application_scanne_un_qr_code_puis_donne_le_code(rh, mfa_container):
    login(rh)

    body = rh.post(SETUP, json={"method": "TOTP"}).json()

    assert body["code"] is None
    assert body["totp"]["qr_code"].startswith("data:image/svg+xml")
    assert body["totp"]["uri"].startswith("otpauth://totp/")
    assert "ACME" in body["totp"]["uri"]
    secret = body["totp"]["secret"]
    assert rh.post(SETUP_CONFIRM, json={"code": totp_code(mfa_container, secret)}).status_code == 204
    assert rh.get(RH_PAGE).status_code == 200


def test_ca03_connexion_suivante_avec_le_code_de_l_application(rh, mfa_container):
    secret = enroll_totp(rh, mfa_container)
    rh.cookies.clear()

    response = login(rh)
    assert response.json() == {"mfa": {"enrolled": True, "method": "TOTP", "destination": None}, "code": None}

    mfa_container.clock.advance(minutes=3)
    assert rh.post(VERIFY, json={"code": "123456"}).status_code == 422
    assert rh.post(VERIFY, json={"code": totp_code(mfa_container, secret)}).status_code == 204


def test_ca03_aucun_code_a_renvoyer_pour_l_application(rh, mfa_container):
    enroll_totp(rh, mfa_container)
    rh.cookies.clear()
    login(rh)

    assert rh.post(RESEND).status_code == 409


def test_ca03_le_secret_ne_sort_plus_une_fois_enregistre(rh, mfa_container):
    enroll_totp(rh, mfa_container)

    assert "secret" not in json.dumps(rh.get("/api/admin/me/mfa").json())
    assert "secret" not in json.dumps(rh.get("/api/admin/admins").json())


# --- CA-04 : changer de méthode après confirmation avec l'actuelle ---------------------------


def test_ca04_changer_de_methode_demande_le_code_de_la_methode_actuelle(rh, mfa_container):
    enroll_whatsapp(rh)

    refused = rh.post("/api/admin/me/mfa/setup", json={"method": "TOTP"})
    assert refused.status_code == 409

    code = rh.post("/api/admin/me/mfa/code").json()["demo_code"]
    assert rh.post("/api/admin/me/mfa/confirm", json={"code": code}).status_code == 204
    secret = rh.post("/api/admin/me/mfa/setup", json={"method": "TOTP"}).json()["totp"]["secret"]
    assert rh.post("/api/admin/me/mfa/setup/confirm", json={"code": totp_code(mfa_container, secret)}).status_code == 204

    assert rh.get("/api/admin/me/mfa").json() == {"enrolled": True, "method": "TOTP", "destination": None}
    assert rh.get(RH_PAGE).status_code == 200  # la session continue


def test_ca04_le_delai_pour_changer_est_limite(rh, mfa_container):
    enroll_whatsapp(rh)
    code = rh.post("/api/admin/me/mfa/code").json()["demo_code"]
    rh.post("/api/admin/me/mfa/confirm", json={"code": code})

    mfa_container.clock.advance(minutes=10)

    assert rh.post("/api/admin/me/mfa/setup", json={"method": "TOTP"}).status_code == 409


# --- CA-05 : téléphone perdu --------------------------------------------------------------


def test_ca05_un_autre_compte_rh_reinitialise_la_methode(rh, mfa_app, mfa_container):
    enroll_whatsapp(rh)
    rh.post("/api/admin/admins", json={"username": "marie.pierre", "password": "Provisoire-2026!"})
    marie = mfa_container.admin_accounts.find_by_username("marie.pierre")
    with TestClient(mfa_app) as other:
        login(other, "marie.pierre", "Provisoire-2026!")
        code = other.post(SETUP, json={"method": "WHATSAPP", "destination": "+50937222222"}).json()["code"]["demo_code"]
        other.post(SETUP_CONFIRM, json={"code": code})

        assert rh.post(f"/api/admin/admins/{marie.id}/reset-mfa").status_code == 204

        assert other.get("/api/admin/me").status_code == 401  # ses sessions sont fermées
        assert login(other, "marie.pierre", "Provisoire-2026!").json()["mfa"]["enrolled"] is False
    listed = {a["username"]: a["mfa_method"] for a in rh.get("/api/admin/admins").json()}
    assert listed == {ADMIN_USERNAME: "WHATSAPP", "marie.pierre": None}


def test_ca05_on_ne_reinitialise_pas_sa_propre_methode(rh, mfa_container):
    enroll_whatsapp(rh)
    me = mfa_container.admin_accounts.find_by_username(ADMIN_USERNAME)

    response = rh.post(f"/api/admin/admins/{me.id}/reset-mfa")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CANNOT_RESET_OWN_MFA"


# --- CA-06 : réseau des bureaux --------------------------------------------------------------


def test_ca06_hors_du_reseau_des_bureaux_l_espace_rh_est_ferme(settings):
    office = settings.model_copy(update={"admin_mfa_required": True, "rh_allowed_networks": "196.3.0.0/24"})
    app = create_app(office)
    try:
        with TestClient(app) as outside:  # adresse du client de test : « testclient »
            response = login(outside)
            assert response.status_code == 403
            assert response.json()["error"] == {
                "code": "OFFICE_NETWORK_ONLY",
                "message": "L'espace RH n'est accessible que depuis le réseau des bureaux.",
            }
            # l'espace employé reste ouvert partout
            assert outside.post("/api/auth/login", json=EMP_A.identity(password="x")).status_code == 401
        with TestClient(app, client=("196.3.0.42", 50000)) as inside:
            assert login(inside).status_code == 202
    finally:
        app.state.container.close()


# --- CA-07 : traces ---------------------------------------------------------------------------


def test_ca07_connexions_et_changements_sont_traces_sans_code(rh, security_events):
    login(rh, password="mauvais")
    enroll_whatsapp(rh)
    rh.cookies.clear()
    login(rh)
    rh.post(VERIFY, json={"code": "000000"})

    events = [event["event"] for event in security_events]
    assert events == [
        "ADMIN_LOGIN_FAILED",
        "ADMIN_PASSWORD_OK",
        "MFA_ENROLLED",
        "ADMIN_LOGIN_SUCCEEDED",
        "ADMIN_PASSWORD_OK",
        "ADMIN_LOGIN_FAILED",
    ]
    assert all(set(event) <= {"event", "admin_id", "method", "reason", "username", "by"} for event in security_events)


# --- Session « en attente du code » --------------------------------------------------------


def test_la_session_en_attente_du_code_expire_apres_10_minutes(rh, mfa_container):
    login(rh)

    mfa_container.clock.advance(minutes=10)

    assert rh.get(MFA).status_code == 401


def test_sans_double_authentification_exigee_la_connexion_reste_en_une_etape(client):
    assert login(client).status_code == 204
