"""US-1004 : envoi du code de connexion par WhatsApp.

- `MetaWhatsAppSender` : API officielle de Meta (Cloud API), modèle « Authentification » approuvé, avec le bouton
  « Copier le code » (doc PAM) ; jeton d'utilisateur système (`WHATSAPP_META_TOKEN`, Secrets Manager en production) ;
- `LocalWhatsAppSender` : poste du développeur et tests, rien ne part, les messages restent en mémoire ;
- `UnconfiguredWhatsAppSender` : ailleurs sans configuration, aucun envoi possible.

Le journal ne garde que le numéro masqué, jamais le code.
"""

import json
import logging
import re
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass

from app.auth.domain.mfa import MfaMethod, mask_destination
from app.auth.domain.ports import MessageNotSent

logger = logging.getLogger("acme.security")
GRAPH_API = "https://graph.facebook.com/v19.0"


@dataclass(frozen=True)
class WhatsAppMessage:
    to: str
    code: str


class LocalWhatsAppSender:
    configured = True

    def __init__(self) -> None:
        self.outbox: list[WhatsAppMessage] = []

    def send_code(self, to: str, code: str) -> None:
        self.outbox.append(WhatsAppMessage(to, code))
        logger.info("Code WhatsApp pour %s (non envoyé, poste local)", mask_destination(MfaMethod.WHATSAPP, to))


class UnconfiguredWhatsAppSender:
    configured = False

    def send_code(self, to: str, code: str) -> None:
        raise MessageNotSent("WhatsApp n'est pas configuré (WHATSAPP_META_TOKEN, WHATSAPP_TEMPLATE).")


def _post(url: str, body: dict, token: str) -> None:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10):
        pass


class MetaWhatsAppSender:
    configured = True

    def __init__(
        self,
        token: str,
        phone_number_id: str,
        template: str,
        *,
        language: str = "fr",
        post: Callable[[str, dict, str], None] = _post,
    ) -> None:
        self._token = token
        self._phone_number_id = phone_number_id
        self._template = template
        self._language = language
        self._post = post

    def send_code(self, to: str, code: str) -> None:
        body = {
            "messaging_product": "whatsapp",
            "to": re.sub(r"\D", "", to),
            "type": "template",
            "template": {
                "name": self._template,
                "language": {"code": self._language},
                "components": [
                    {"type": "body", "parameters": [{"type": "text", "text": code}]},
                    # Bouton « Copier le code » du modèle « Authentification ».
                    {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": code}]},
                ],
            },
        }
        try:
            self._post(f"{GRAPH_API}/{self._phone_number_id}/messages", body, self._token)
        except Exception as error:  # noqa: BLE001 — refus de Meta ou erreur réseau
            logger.warning(
                "Code WhatsApp non envoyé à %s (%s)", mask_destination(MfaMethod.WHATSAPP, to), type(error).__name__
            )
            raise MessageNotSent("WhatsApp") from error
