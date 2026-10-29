"""US-1003 — Me connecter avec un code reçu par courriel (lot 5, PAM).

Sur le poste local (les tests), aucun courriel ne part : `LocalEmailSender` garde les messages en mémoire
(`outbox`) et l'API rend le code (`local_code`) pour l'écran.
"""

import logging
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.infrastructure.email import LocalEmailSender, SesEmailSender, UnconfiguredEmailSender
from app.config import Settings
from app.container import email_sender
from app.main import create_app
from tests.conftest import admin_session, employee_login
from tests.employees import EMP_A, EMP_B, EMP_D2, EMP_I

IDENTIFY, CODE, VERIFY = "/api/auth/identify", "/api/auth/code", "/api/auth/verify"
GENERIC = "Informations incorrectes."
DOSSIER = "/api/me/dossier"


def _identify(client, employee=EMP_A, **overrides):
    body = {"employee_code": employee.employee_code, "birth_date": employee.typed_birth_date, **overrides}
    return client.post(IDENTIFY, json=body)


def _send(client):
    return client.post(CODE, json={"channel": "EMAIL"})


def _code(client, employee=EMP_A) -> str:
    assert _identify(client, employee).status_code == 200
    response = _send(client)
    assert response.status_code == 200, response.text
    return response.json()["local_code"]


def _wrong(code: str) -> str:
    return f"{(int(code) + 1) % 1_000_000:06d}"


@pytest.fixture
def outbox(container) -> list:
    return container.email_sender.outbox


# --- CA-01 : écran 1, même réponse pour toute erreur ------------------------------------------


def test_ca01_code_et_date_justes_proposent_le_courriel_masque(client):
    response = _identify(client)

    assert response.status_code == 200
    email = next(option for option in response.json()["channels"] if option["channel"] == "EMAIL")
    assert email == {"channel": "EMAIL", "destination": "j•••@exemple.test", "available": True, "remaining": None, "recently_changed": False, "unavailable": False}
    assert client.get(DOSSIER).status_code == 401  # l'identification seule n'ouvre pas l'espace


def test_ca01_le_code_est_lu_sans_majuscules_ni_espaces(client):
    assert _identify(client, employee_code=f"  {EMP_A.employee_code.lower()} ").status_code == 200


@pytest.mark.parametrize(
    "overrides",
    [
        {"employee_code": "AC-9999"},  # inconnu
        {"employee_code": EMP_I.employee_code, "birth_date": EMP_I.typed_birth_date},  # inactif
        {"birth_date": "16031996"},  # date fausse
        {"birth_date": "32031996"},  # US-1014 : date impossible
        {"birth_date": "1503199"},  # US-1014 : sept chiffres
        {"birth_date": "1996-03-15"},  # US-1014 : pas le format JJMMAAAA
    ],
)
def test_ca01_meme_message_pour_toute_erreur(client, overrides):
    response = _identify(client, **overrides)

    assert response.status_code == 401
    assert response.json()["error"] == {"code": "INVALID_CREDENTIALS", "message": GENERIC}


def test_ca01_meme_delai_minimal_de_reponse(client, container):
    container.settings.login_min_response_ms = 150
    for overrides in ({"employee_code": "AC-9999"}, {"birth_date": "16031996"}, {}):
        started = time.perf_counter()
        _identify(client, **overrides)
        assert time.perf_counter() - started >= 0.15


# CA-02 (verrouillage) : remplacé par US-1015, voir test_us1015_captcha_et_verrous.py.


def _five_wrong_dates(client, employee=EMP_A):
    responses = [_identify(client, employee, birth_date="16031996") for _ in range(5)]
    return responses[-1]


# --- CA-03 : écran 2, le courriel de Vault seulement -------------------------------------------


def test_ca03_sans_courriel_contactez_la_drh(client, outbox):
    response = _identify(client, EMP_D2)
    email = next(option for option in response.json()["channels"] if option["channel"] == "EMAIL")
    assert email == {"channel": "EMAIL", "destination": None, "available": False, "remaining": None, "recently_changed": False, "unavailable": False}

    sent = _send(client)
    assert sent.status_code == 409
    assert sent.json()["error"]["code"] == "CONTACT_HR"
    assert "Contactez la DRH" in sent.json()["error"]["message"]
    assert outbox == []


def test_ca03_aucune_autre_adresse_ne_peut_etre_saisie(client, outbox):
    _identify(client)

    assert client.post(CODE, json={"channel": "EMAIL", "destination": "pirate@exemple.test"}).status_code == 422
    assert client.post(CODE, json={"channel": "SMS"}).status_code == 422
    assert outbox == []


def test_ca03_sans_identification_pas_de_code(client, outbox):
    assert _send(client).status_code == 401
    assert outbox == []


# --- CA-04 : code à usage unique, 5 minutes, 3 essais, lié à la session ------------------------


def test_ca04_seule_l_empreinte_du_code_est_conservee(client, container):
    code = _code(client)

    stored = container.login_codes.get(EMP_A.id)
    assert stored.code_hash != code and code not in stored.code_hash and len(stored.code_hash) == 64


def test_ca04_le_code_expire_apres_5_minutes(client, clock):
    code = _code(client)
    clock.advance(minutes=5)

    response = client.post(VERIFY, json={"code": code})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_CODE"


def test_ca04_trois_essais(client):
    code = _code(client)
    first = client.post(VERIFY, json={"code": _wrong(code)})
    assert first.json()["error"]["code"] == "INVALID_CODE"
    assert first.json()["error"]["message"] == "Code incorrect ou expiré."  # US-1016 : ni essais restants
    assert "remaining_attempts" not in first.json()["error"]
    client.post(VERIFY, json={"code": _wrong(code)})
    client.post(VERIFY, json={"code": _wrong(code)})

    assert client.post(VERIFY, json={"code": code}).json()["error"]["code"] == "INVALID_CODE"


def test_ca04_le_code_ne_sert_qu_une_fois(app, client):
    code = _code(client)
    assert client.post(VERIFY, json={"code": code}).status_code == 204

    with TestClient(app) as other:
        _identify(other)
        assert other.post(VERIFY, json={"code": code}).status_code == 422


def test_ca04_le_code_est_lie_a_la_session_d_identification(app, client):
    code = _code(client)
    with TestClient(app) as other:
        _identify(other)  # autre identification du même employé, sans demander de code

        assert other.post(VERIFY, json={"code": code}).json()["error"]["code"] == "INVALID_CODE"


def test_ca04_un_code_mal_forme_est_refuse_pres_du_champ(client):
    _code(client)

    response = client.post(VERIFY, json={"code": "12ab"})
    assert response.status_code == 422


# --- CA-05 : renvoi ------------------------------------------------------------------------------


def test_ca05_renvoi_apres_60_secondes_et_l_ancien_code_ne_vaut_plus(client, clock):
    first = _code(client)
    early = _send(client)
    assert early.status_code == 429
    assert (early.json()["error"]["code"], early.json()["error"]["retry_after"]) == ("CODE_RESEND_TOO_SOON", 60)

    clock.advance(seconds=60)
    second = _send(client).json()["local_code"]
    if second != first:
        assert client.post(VERIFY, json={"code": first}).json()["error"]["code"] == "INVALID_CODE"
    assert client.post(VERIFY, json={"code": second}).status_code == 204


def test_ca05_trois_renvois_au_plus_par_15_minutes(client, clock):
    _code(client)
    for _ in range(3):
        clock.advance(seconds=60)
        assert _send(client).status_code == 200
    clock.advance(seconds=60)

    response = _send(client)
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "TOO_MANY_CODES"


def test_ca05_la_reponse_donne_les_delais_pour_l_ecran(client):
    _identify(client)
    body = _send(client).json()

    assert (body["channel"], body["destination"], body["expires_in"], body["resend_in"]) == (
        "EMAIL",
        "j•••@exemple.test",
        300,
        60,
    )


# --- CA-06 : session ouverte, connexion au journal ---------------------------------------------


def test_ca06_le_bon_code_ouvre_la_session(client, container, clock):
    code = _code(client)
    response = client.post(VERIFY, json={"code": code})

    assert response.status_code == 204
    assert SESSION_COOKIE in response.cookies
    assert client.get(DOSSIER).status_code == 200
    assert [(login.employee_id, login.at) for login in container.employee_logins.all()] == [(EMP_A.id, clock.now())]


def test_ca06_une_identification_ratee_n_est_pas_au_journal(client, container):
    _identify(client, birth_date="16031996")
    code = _code(client)
    client.post(VERIFY, json={"code": _wrong(code)})

    assert container.employee_logins.all() == []


def test_ca06_la_session_employe_expire_apres_15_minutes_sans_activite(client, clock):
    employee_login(client, EMP_A)
    clock.advance(minutes=15)

    assert client.get(DOSSIER).status_code == 401


def test_ca06_l_identification_seule_n_ouvre_pas_l_espace_de_gestion(client):
    _identify(client)

    assert client.get("/api/admin/me").status_code == 401


# --- CA-07 : contenu des courriels -------------------------------------------------------------


def test_ca07_le_courriel_du_code(client, outbox):
    code = _code(client)

    message = outbox[-1]
    assert message.to == "jean.joseph@exemple.test"
    assert code in message.body and "5 minutes" in message.body
    assert message.subject == "ACME SA — Code de vérification PAM"  # US-1016 : modèle du directeur
    assert message.body.startswith("Bonjour Jean,")
    assert "Ne communiquez jamais ce code" in message.body
    assert code in message.html and "{{" not in message.html
    _assert_discreet(message)


def test_ca07_courriel_apres_une_connexion_reussie(client, outbox):
    employee_login(client, EMP_A)

    message = outbox[-1]
    assert message.to == "jean.joseph@exemple.test" and message.subject == "ACME SA — PAM"
    assert "Une consultation de vos documents de paie" in message.body and message.html  # US-1025 : en HTML
    _assert_discreet(message)


def _assert_discreet(message) -> None:
    text = f"{message.subject}\n{message.body}"
    assert "http" not in text and "www." not in text
    assert EMP_A.employee_code not in text
    assert f"{EMP_A.first_name} {EMP_A.last_name}" not in text and EMP_A.last_name not in text


# --- CA-08 : plus de mot de passe ; « Débloquer l'accès » ----------------------------------------


@pytest.mark.parametrize("route", ["/api/auth/register", "/api/auth/login"])
def test_ca08_les_routes_du_mot_de_passe_n_existent_plus(client, route):
    assert client.post(route, json=EMP_A.identity(password="Bonjour-2026")).status_code in (404, 405)


def test_ca08_debloquer_ferme_les_sessions_de_l_employe(admin_client, employee_client):
    employee = employee_client(EMP_A)

    admin_client.post(f"/api/admin/employees/{EMP_A.id}/reset-access")
    assert employee.get(DOSSIER).status_code == 401


def test_ca08_debloquer_un_employe_jamais_connecte_est_possible(admin_client):
    assert admin_client.post(f"/api/admin/employees/{EMP_B.id}/reset-access").status_code == 204


def test_ca08_la_fiche_rh_dit_si_l_employe_s_est_deja_connecte_et_s_il_est_verrouille(admin_client, client):
    before = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    assert (before["account_activated"], before["access_locked"]) == (False, False)

    employee_login(client, EMP_A)
    with TestClient(client.app) as other:
        _five_wrong_dates(other)

    after = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()
    assert (after["account_activated"], after["access_locked"]) == (True, True)


# --- CA-09 : journaux techniques -----------------------------------------------------------------


def test_ca09_rien_de_personnel_dans_les_journaux(client, caplog):
    with caplog.at_level(logging.DEBUG):
        code = _code(client)
        client.post(VERIFY, json={"code": _wrong(code)})
        client.post(VERIFY, json={"code": code})
        _five_wrong_dates(client, EMP_B)

    for secret in (EMP_A.employee_code, EMP_A.birth_date, "03/15/1996", code, "jean.joseph@exemple.test",
                   EMP_B.employee_code, EMP_B.birth_date):
        assert secret not in caplog.text


# --- CA-10 : envoi par SES ; sans SES hors du poste local, aucun code ------------------------------


def test_ca10_poste_local_le_code_est_rendu_a_l_ecran(client):
    _identify(client)

    assert _send(client).json()["local_code"].isdigit()


def test_ca10_choix_de_l_envoi_selon_l_environnement(tmp_path):
    pg = "postgresql://u:p@db.exemple.test/portail"
    assert isinstance(email_sender(Settings(_env_file=None, acme_data_dir=tmp_path)), LocalEmailSender)
    for env in ("demo", "recette", "production"):
        unset = Settings(_env_file=None, app_env=env, database_url=pg)
        assert isinstance(email_sender(unset), UnconfiguredEmailSender)
        configured = Settings(_env_file=None, app_env=env, database_url=pg, ses_sender="pam@exemple.test")
        assert isinstance(email_sender(configured), SesEmailSender)


def test_ca10_demonstrateur_sans_ses_connexion_momentanement_impossible(tmp_path: Path):
    settings = Settings(
        _env_file=None,
        app_env="demo",
        database_url=f"sqlite:///{(tmp_path / 'demo.db').as_posix()}",
        acme_data_dir=tmp_path / "data",
        frontend_dist_dir=tmp_path / "dist",
        login_min_response_ms=0,
        otp_hmac_key="cle-de-demo",
    )
    app = create_app(settings)
    with TestClient(app) as demo:
        assert _identify(demo).status_code == 200
        response = _send(demo)
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "LOGIN_UNAVAILABLE"
        assert "local_code" not in response.text
    app.state.container.close()


def test_ca10_ses_recoit_l_expediteur_le_destinataire_et_le_texte():
    class FakeSes:
        def __init__(self):
            self.calls = []

        def send_email(self, **kwargs):
            self.calls.append(kwargs)

    ses = FakeSes()
    SesEmailSender(ses, "pam@exemple.test").send("jean.joseph@exemple.test", "Votre code", "Code : 123456")

    (call,) = ses.calls
    assert call["FromEmailAddress"] == "pam@exemple.test"
    assert call["Destination"] == {"ToAddresses": ["jean.joseph@exemple.test"]}
    simple = call["Content"]["Simple"]
    assert simple["Subject"]["Data"] == "Votre code"
    assert simple["Body"]["Text"]["Data"] == "Code : 123456"
    assert simple["Body"]["Text"]["Charset"] == "UTF-8"


def test_ca10_en_production_la_cle_hmac_est_obligatoire(tmp_path):
    from app.container import otp_key

    pg = "postgresql://u:p@db.exemple.test/portail"
    with pytest.raises(ValueError, match="OTP_HMAC_KEY"):
        otp_key(Settings(_env_file=None, app_env="production", database_url=pg))
    assert otp_key(Settings(_env_file=None, app_env="production", database_url=pg, otp_hmac_key="k")) == "k"
    assert otp_key(Settings(_env_file=None, acme_data_dir=tmp_path))  # poste local : clé de développement


def test_une_session_rh_reste_independante(container, client):
    token = admin_session(container)
    with TestClient(client.app, cookies={SESSION_COOKIE: token}) as admin:
        assert admin.get("/api/admin/me").status_code == 200
