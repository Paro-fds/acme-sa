"""US-1005 — Bloquer un contact récemment changé (lot 5, PAM).

Le changement de Vault est simulé en remplaçant le courriel ou le numéro lu pour un employé (`VaultChange`).
"""

from dataclasses import replace

import pytest

from app.auth.domain.contacts import CONTACT_HOLD
from app.auth.domain.login_code import LoginChannel
from tests.employees import EMP_A

IDENTIFY, CODE = "/api/auth/identify", "/api/auth/code"
HELD = "Ce contact a été modifié il y a moins de 72 heures. Contactez la DRH."


class VaultChange:
    """Liste de Vault où le courriel ou le numéro d'un employé a été changé."""

    def __init__(self, inner) -> None:
        self._inner = inner
        self.changes: dict[str, dict] = {}

    def _apply(self, employee):
        return employee and replace(employee, **self.changes.get(employee.id, {}))

    def get(self, employee_id):
        return self._apply(self._inner.get(employee_id))

    def list_all(self):
        return [self._apply(e) for e in self._inner.list_all()]

    def __getattr__(self, name):
        return getattr(self._inner, name)


@pytest.fixture
def vault(container) -> VaultChange:
    container.employees = VaultChange(container.employees)
    return container.employees


def _identify(client, employee=EMP_A):
    response = client.post(IDENTIFY, json={"employee_code": employee.employee_code, "birth_date": employee.typed_birth_date})
    assert response.status_code == 200, response.text
    return {option["channel"]: option for option in response.json()["channels"]}


def _send(client, channel):
    return client.post(CODE, json={"channel": channel})


# --- CA-01 : dernier contact vu ; le premier n'est pas bloqué ---------------------------------------


def test_ca01_le_premier_contact_vu_n_est_pas_bloque(client, container, vault):
    channels = _identify(client)

    assert channels["EMAIL"]["available"] and not channels["EMAIL"]["recently_changed"]
    assert channels["WHATSAPP"]["available"] and not channels["WHATSAPP"]["recently_changed"]
    seen = container.seen_contacts.get(EMP_A.id, LoginChannel.EMAIL)
    assert seen.value and seen.changed_at is None
    assert _send(client, "EMAIL").status_code == 200


# --- CA-02 : un contact changé ne reçoit pas de code pendant 72 heures ------------------------------


def test_ca02_courriel_change_grise_et_refuse(client, vault):
    _identify(client)
    vault.changes[EMP_A.id] = {"email_address": "autre.adresse@exemple.test"}

    channels = _identify(client)
    assert channels["EMAIL"]["available"] is False and channels["EMAIL"]["recently_changed"] is True

    refused = _send(client, "EMAIL")
    assert refused.status_code == 409
    assert refused.json()["error"] == {"code": "CONTACT_HR", "message": HELD}


def test_ca02_numero_change_grise_et_refuse(client, container, vault):
    _identify(client)
    vault.changes[EMP_A.id] = {"telephone_number": "+509 3799-0000"}

    channels = _identify(client)
    assert channels["WHATSAPP"]["available"] is False and channels["WHATSAPP"]["recently_changed"] is True
    assert _send(client, "WHATSAPP").json()["error"]["message"] == HELD
    assert container.whatsapp_sender.outbox == []


def test_ca02_changement_entre_l_identification_et_l_envoi(client, container, vault):
    _identify(client)
    vault.changes[EMP_A.id] = {"email_address": "autre.adresse@exemple.test"}

    assert _send(client, "EMAIL").json()["error"]["message"] == HELD
    assert not any(m.to == "autre.adresse@exemple.test" and "Code de vérification" in m.subject
                   for m in container.email_sender.outbox)


# --- CA-03 : avertissement par courriel, à l'ancienne et à la nouvelle adresse --------------------------


def test_ca03_courriel_change_previent_l_ancienne_adresse(client, container, vault):
    _identify(client)
    old = container.seen_contacts.get(EMP_A.id, LoginChannel.EMAIL).value
    vault.changes[EMP_A.id] = {"email_address": "autre.adresse@exemple.test"}
    container.email_sender.outbox.clear()

    _identify(client)
    _identify(client)  # vu une seule fois

    alerts = [m for m in container.email_sender.outbox if "du profil RH a changé" in m.body]
    assert [m.to for m in alerts] == [old]  # pas la nouvelle adresse (modèle du directeur)
    for message in alerts:
        assert "Votre adresse du profil RH a changé" in message.body
        assert "http" not in message.body and EMP_A.employee_code not in message.body
        assert EMP_A.last_name not in message.body.upper()
    assert container.whatsapp_sender.outbox == []


def test_ca03_numero_change_previent_le_courriel_actuel_jamais_whatsapp(client, container, vault):
    _identify(client)
    email = container.seen_contacts.get(EMP_A.id, LoginChannel.EMAIL).value
    vault.changes[EMP_A.id] = {"telephone_number": "+509 3799-0000"}
    container.email_sender.outbox.clear()

    _identify(client)

    alerts = [m for m in container.email_sender.outbox if "du profil RH a changé" in m.body]
    assert [m.to for m in alerts] == [email]
    assert "Votre numéro du profil RH a changé" in alerts[0].body
    assert container.whatsapp_sender.outbox == []


# --- CA-04 : après 72 heures, proposé normalement ; l'autre canal reste utilisable --------------------


def test_ca04_l_autre_canal_reste_utilisable(client, vault):
    _identify(client)
    vault.changes[EMP_A.id] = {"email_address": "autre.adresse@exemple.test"}

    channels = _identify(client)
    assert channels["WHATSAPP"]["available"] is True
    assert _send(client, "WHATSAPP").status_code == 200


def test_ca04_apres_72_heures_le_contact_est_propose(client, clock, vault):
    _identify(client)
    vault.changes[EMP_A.id] = {"email_address": "autre.adresse@exemple.test"}
    _identify(client)

    clock.advance(seconds=CONTACT_HOLD.total_seconds() - 60)
    assert _identify(client)["EMAIL"]["available"] is False
    clock.advance(seconds=60)
    channels = _identify(client)
    assert channels["EMAIL"]["available"] is True and channels["EMAIL"]["recently_changed"] is False
    assert _send(client, "EMAIL").status_code == 200
