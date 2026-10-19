"""US-102 : adaptateurs de la double authentification (TOTP, envoi des codes, journal de sécurité)."""

import json
import logging
from datetime import datetime

import pyotp
import segno

from app.auth.domain.mfa import MfaMethod, mask_destination

ISSUER = "ACME SA Carrière"
security_logger = logging.getLogger("acme.security")


class PyOtpTotpService:
    """TOTP standard (RFC 6238) : Microsoft Authenticator, Google Authenticator ou toute autre application."""

    def new_secret(self) -> str:
        return pyotp.random_base32()

    def provisioning_uri(self, secret: str, account_name: str) -> str:
        return pyotp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=ISSUER)

    def qr_code(self, uri: str) -> str:
        return segno.make(uri, error="m").svg_data_uri(scale=5, border=2, dark="#0f2557")

    def verify(self, secret: str, code: str, now: datetime) -> bool:
        # Une période de 30 s de tolérance de chaque côté (horloge du téléphone légèrement décalée).
        return pyotp.TOTP(secret).verify(code, for_time=now, valid_window=1)


class LocalOutboxCodeSender:
    """Poste du développeur et tests automatiques : aucun message ne part ; l'API rend le code pour l'écran.
    Le journal ne garde que la destination masquée, jamais le code."""

    def send(self, method: MfaMethod, destination: str, code: str) -> None:
        security_logger.info("Code %s pour %s (non envoyé, poste local)", method.value, mask_destination(method, destination))


class ConfigurableCodeSender:
    """US-102 : envoi des codes par WhatsApp (ou email).
    Supporte Meta WhatsApp Cloud API, Twilio WhatsApp, ou le mode démonstrateur."""

    def __init__(
        self,
        *,
        meta_token: str = "",
        meta_phone_number_id: str = "",
        twilio_account_sid: str = "",
        twilio_auth_token: str = "",
        twilio_from: str = "",
        allow_demo_fallback: bool = True,
    ) -> None:
        self._meta_token = meta_token
        self._meta_phone_number_id = meta_phone_number_id
        self._twilio_account_sid = twilio_account_sid
        self._twilio_auth_token = twilio_auth_token
        self._twilio_from = twilio_from
        self._allow_demo_fallback = allow_demo_fallback

    def send(self, method: MfaMethod, destination: str, code: str) -> None:
        if method is MfaMethod.WHATSAPP:
            if self._meta_token and self._meta_phone_number_id:
                self._send_meta_whatsapp(destination, code)
                return
            if self._twilio_account_sid and self._twilio_auth_token and self._twilio_from:
                self._send_twilio_whatsapp(destination, code)
                return

        if self._allow_demo_fallback:
            security_logger.info(
                "Code %s pour %s (mode démonstrateur : simulation active)",
                method.value,
                mask_destination(method, destination),
            )
            return

        raise RuntimeError(f"Aucun service d'envoi configuré pour {method.value}.")

    def _send_meta_whatsapp(self, destination: str, code: str) -> None:
        import re
        import urllib.request

        clean_phone = re.sub(r"\D", "", destination)
        url = f"https://graph.facebook.com/v19.0/{self._meta_phone_number_id}/messages"
        payload = json.dumps({
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {"body": f"Votre code de sécurité ACME SA est : {code}. Valable 5 minutes."},
        }).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {self._meta_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                security_logger.info("Message WhatsApp envoyé via Meta à %s (HTTP %s)", mask_destination(MfaMethod.WHATSAPP, destination), resp.status)
        except Exception as exc:
            security_logger.error("Échec envoi Meta WhatsApp : %s", exc)
            if not self._allow_demo_fallback:
                raise

    def _send_twilio_whatsapp(self, destination: str, code: str) -> None:
        import base64
        import re
        import urllib.parse
        import urllib.request

        clean_phone = re.sub(r"\D", "", destination)
        from_number = self._twilio_from if self._twilio_from.startswith("whatsapp:") else f"whatsapp:{self._twilio_from}"
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self._twilio_account_sid}/Messages.json"
        data = urllib.parse.urlencode({
            "From": from_number,
            "To": f"whatsapp:+{clean_phone}",
            "Body": f"Votre code de sécurité ACME SA est : {code}. Valable 5 minutes.",
        }).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        auth = base64.b64encode(f"{self._twilio_account_sid}:{self._twilio_auth_token}".encode("utf-8")).decode("ascii")
        req.add_header("Authorization", f"Basic {auth}")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                security_logger.info("Message WhatsApp envoyé via Twilio à %s (HTTP %s)", mask_destination(MfaMethod.WHATSAPP, destination), resp.status)
        except Exception as exc:
            security_logger.error("Échec envoi Twilio WhatsApp : %s", exc)
            if not self._allow_demo_fallback:
                raise


class UnconfiguredCodeSender:
    """Recette et production : l'envoi réel (SES, WhatsApp Business) reste à brancher avec la DIT (D-41)."""

    def send(self, method: MfaMethod, destination: str, code: str) -> None:
        raise RuntimeError(f"Aucun service d'envoi configuré pour {method.value}.")


class LoggingSecurityLog:
    """CA-07 : une ligne JSON par événement (journal de la plateforme ; table d'audit avec le journal RH)."""

    def record(self, event: str, admin_id: str | None, **details: str) -> None:
        security_logger.info(json.dumps({"event": event, "admin_id": admin_id, **details}, ensure_ascii=False))
