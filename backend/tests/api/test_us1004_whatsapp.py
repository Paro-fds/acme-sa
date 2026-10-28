"""US-1004 — Recevoir le code par WhatsApp (lot 5, PAM).

Sur le poste local (les tests), rien ne part : `LocalWhatsAppSender` garde les messages en mémoire (`outbox`)
et l'API rend le code (`local_code`).
"""

from datetime import UTC, datetime

import pytest

from app.auth.domain.errors import WhatsAppQuotaReached
from app.auth.domain.whatsapp import MONTHLY_QUOTA, WhatsAppQuota, month_of, whatsapp_number
from app.auth.infrastructure.whatsapp import LocalWhatsAppSender, MetaWhatsAppSender, UnconfiguredWhatsAppSender
from app.config import Settings
from app.container import whatsapp_sender
from tests.conftest import employee_login
from tests.employees import EMP_A, EMP_E

IDENTIFY, CODE, VERIFY = "/api/auth/identify", "/api/auth/code", "/api/auth/verify"


def _identify(client, employee=EMP_E):
    return client.post(IDENTIFY, json={"employee_code": employee.employee_code, "birth_date": employee.typed_birth_date})


def _send(client, channel="WHATSAPP"):
    return client.post(CODE, json={"channel": channel})


def _channels(response) -> dict:
    return {option["channel"]: option for option in response.json()["channels"]}


@pytest.fixture
def whatsapp_outbox(container) -> list:
    return container.whatsapp_sender.outbox


# --- CA-01 : écran 2, numéro masqué et messages restants ---------------------------------------


def test_ca01_whatsapp_propose_avec_le_numero_masque_et_le_quota(client):
    channels = _channels(_identify(client))

    assert channels["WHATSAPP"] == {"channel": "WHATSAPP", "destination": "+509 •••• 7777", "available": True, "remaining": 5, "recently_changed": False, "unavailable": False}
    assert channels["EMAIL"]["available"] is False  # EMP-E n'a pas de courriel


def test_ca01_les_deux_canaux_quand_le_dossier_a_les_deux(client):
    channels = _channels(_identify(client, EMP_A))

    assert channels["EMAIL"]["available"] and channels["WHATSAPP"]["available"]
    assert channels["EMAIL"]["remaining"] is None


def test_ca01_aucun_autre_numero_ne_peut_etre_donne(client, whatsapp_outbox):
    _identify(client)

    assert client.post(CODE, json={"channel": "WHATSAPP", "destination": "+50930000000"}).status_code == 422
    assert whatsapp_outbox == []


# --- CA-02 : numéro de Vault au format international ---------------------------------------------


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("+50937221111", "+50937221111"),
        ("+509 3722-7777", "+50937227777"),
        ("37228888", "+50937228888"),
        ("509 3722 8888", "+50937228888"),
        ("(509) 3722.8888", "+50937228888"),
        ("", None),
        ("3722", None),
        ("pas un numéro", None),
    ],
)
def test_ca02_numero_lu_au_format_international(raw, expected):
    assert whatsapp_number(raw) == expected


# --- CA-03 : quota de 5 messages par mois civil, renvois compris ---------------------------------


def test_ca03_le_quota_compte_chaque_envoi(client, clock, whatsapp_outbox):
    remaining = []
    for _ in range(MONTHLY_QUOTA):
        _identify(client)  # US-1017 : l'identification dure 20 minutes, sans être prolongée
        response = _send(client)
        assert response.status_code == 200, response.text
        remaining.append(response.json()["remaining"])
        clock.advance(minutes=5)  # renvois espacés : ni le délai de 60 s ni les 4 envois par 15 minutes ne jouent
    assert remaining == [4, 3, 2, 1, 0]

    _identify(client)
    refused = _send(client)
    assert refused.status_code == 429
    assert refused.json()["error"]["code"] == "WHATSAPP_QUOTA_REACHED"
    assert len(whatsapp_outbox) == MONTHLY_QUOTA
    assert _channels(_identify(client))["WHATSAPP"] == {
        "channel": "WHATSAPP", "destination": "+509 •••• 7777", "available": False, "remaining": 0, "recently_changed": False, "unavailable": False,
    }


def test_ca03_quota_atteint_le_courriel_reste_propose(client, container, clock):
    container.whatsapp_quotas.save(WhatsAppQuota(EMP_A.id, month_of(clock.now()), MONTHLY_QUOTA))

    channels = _channels(_identify(client, EMP_A))
    assert channels["WHATSAPP"]["available"] is False
    assert channels["EMAIL"]["available"] is True
    assert _send(client, "EMAIL").status_code == 200


def test_ca03_le_quota_repart_a_5_le_mois_suivant(client, container, clock):
    container.whatsapp_quotas.save(WhatsAppQuota(EMP_E.id, month_of(clock.now()), MONTHLY_QUOTA))
    clock.advance(days=31)

    assert _channels(_identify(client))["WHATSAPP"]["remaining"] == 5


def test_ca03_le_mois_civil():
    assert month_of(datetime(2026, 10, 31, 23, 59, tzinfo=UTC)) == "2026-10"
    assert month_of(datetime(2026, 11, 1, 0, 0, tzinfo=UTC)) == "2026-11"
    quota = WhatsAppQuota("1007", "2026-10", MONTHLY_QUOTA - 1)
    quota.consume()
    with pytest.raises(WhatsAppQuotaReached):
        quota.consume()


# --- CA-04 : mêmes règles que le courriel ; le code est lié au canal --------------------------------


def test_ca04_connexion_par_whatsapp(client, whatsapp_outbox):
    _identify(client)
    sent = _send(client).json()

    assert (sent["channel"], sent["destination"], sent["expires_in"], sent["resend_in"]) == (
        "WHATSAPP", "+509 •••• 7777", 300, 60,
    )
    assert whatsapp_outbox[-1].to == "+50937227777" and whatsapp_outbox[-1].code == sent["local_code"]
    assert client.post(VERIFY, json={"code": sent["local_code"]}).status_code == 204
    assert client.get("/api/me/dossier").status_code == 200


def test_ca04_renvoi_avant_60_secondes_refuse_et_non_compte(client, container, clock):
    _identify(client)
    _send(client)

    assert _send(client).status_code == 429
    assert container.whatsapp_quotas.get(EMP_E.id, month_of(clock.now())).used == 1


def test_ca04_un_code_whatsapp_ne_vaut_pas_pour_le_courriel(client, clock):
    _identify(client, EMP_A)
    whatsapp_code = _send(client).json()["local_code"]
    clock.advance(seconds=60)
    email_code = _send(client, "EMAIL").json()["local_code"]

    if whatsapp_code != email_code:
        assert client.post(VERIFY, json={"code": whatsapp_code}).json()["error"]["code"] == "INVALID_CODE"
    assert client.post(VERIFY, json={"code": email_code}).status_code == 204


# --- CA-05 : les avertissements ne partent jamais par WhatsApp ----------------------------------------


def test_ca05_aucun_avertissement_par_whatsapp(client, container, clock, whatsapp_outbox):
    _identify(client, EMP_A)
    code = _send(client).json()["local_code"]
    client.post(VERIFY, json={"code": code})
    clock.advance(seconds=60)
    employee_login(client, EMP_A)  # autre connexion, par courriel

    assert len(whatsapp_outbox) == 1  # le seul code demandé
    assert any("Une connexion" in message.body for message in container.email_sender.outbox)


# --- CA-06 : envoi par Meta ; sans configuration, refus hors du poste local ------------------------------


def test_ca06_choix_de_l_envoi_selon_l_environnement(tmp_path):
    pg = "postgresql://u:p@db.exemple.test/portail"
    assert isinstance(whatsapp_sender(Settings(_env_file=None, acme_data_dir=tmp_path)), LocalWhatsAppSender)
    unset = Settings(_env_file=None, app_env="production", database_url=pg)
    assert isinstance(whatsapp_sender(unset), UnconfiguredWhatsAppSender)
    meta = Settings(
        _env_file=None, app_env="production", database_url=pg,
        whatsapp_meta_token="jeton", whatsapp_meta_phone_number_id="123", whatsapp_template="code_pam",
    )
    assert isinstance(whatsapp_sender(meta), MetaWhatsAppSender)


def test_ca06_sans_configuration_connexion_momentanement_impossible(client, container):
    container.whatsapp_sender = UnconfiguredWhatsAppSender()
    _identify(client)

    response = _send(client)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "LOGIN_UNAVAILABLE"


def test_ca06_meta_recoit_le_modele_authentification():
    calls = []
    sender = MetaWhatsAppSender("jeton", "123", "code_pam", post=lambda url, body, token: calls.append((url, body, token)))

    sender.send_code("+50937227777", "424242")

    ((url, body, token),) = calls
    assert url.endswith("/123/messages") and token == "jeton"
    assert body["to"] == "50937227777" and body["type"] == "template"
    assert body["template"]["name"] == "code_pam"
    texts = [p["text"] for c in body["template"]["components"] for p in c["parameters"]]
    assert texts == ["424242", "424242"]  # corps du message et bouton « Copier le code »
