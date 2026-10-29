"""US-1018 — WhatsApp « Indisponible » tant que le modèle Meta et le jeton manquent (modèle du directeur)."""

from app.auth.infrastructure.whatsapp import UnconfiguredWhatsAppSender
from tests.employees import EMP_A, EMP_E

IDENTIFY, CODE = "/api/auth/identify", "/api/auth/code"


def _channels(client, employee=EMP_A) -> dict:
    response = client.post(IDENTIFY, json={"employee_code": employee.employee_code,
                                           "birth_date": employee.typed_birth_date})
    return {option["channel"]: option for option in response.json()["channels"]}


def test_ca01_whatsapp_affiche_grise_le_courriel_reste_propose(client, container):
    container.whatsapp_sender = UnconfiguredWhatsAppSender()

    channels = _channels(client)
    assert channels["WHATSAPP"]["available"] is False and channels["WHATSAPP"]["unavailable"] is True
    assert channels["WHATSAPP"]["destination"] == "+509 •••• 1111"  # le numéro reste affiché, masqué
    assert channels["EMAIL"]["available"] is True and channels["EMAIL"]["unavailable"] is False


def test_ca02_une_demande_whatsapp_n_envoie_rien(client, container):
    container.whatsapp_sender = UnconfiguredWhatsAppSender()
    _channels(client, EMP_E)

    response = client.post(CODE, json={"channel": "WHATSAPP"})
    assert response.status_code == 503
    assert response.json()["error"]["message"] == "WhatsApp est indisponible."
    assert container.whatsapp_quotas.get(EMP_E.id, "2026-10") is None  # aucun message compté


def test_ca03_configure_whatsapp_est_propose(client):
    channels = _channels(client)  # poste local : LocalWhatsAppSender

    assert channels["WHATSAPP"]["available"] is True and channels["WHATSAPP"]["unavailable"] is False
