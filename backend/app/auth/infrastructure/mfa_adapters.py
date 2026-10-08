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


class DemoCodeSender:
    """Démonstrateur et poste du développeur : aucun message ne part. Le code est rendu à l'écran
    (« boîte de démonstration ») ; le journal ne garde que la destination masquée, jamais le code."""

    def send(self, method: MfaMethod, destination: str, code: str) -> None:
        security_logger.info("Code de démonstration %s pour %s (non envoyé)", method.value, mask_destination(method, destination))


class UnconfiguredCodeSender:
    """Recette et production : l'envoi réel (SES, WhatsApp Business) reste à brancher avec la DIT (D-41)."""

    def send(self, method: MfaMethod, destination: str, code: str) -> None:
        raise RuntimeError(f"Aucun service d'envoi configuré pour {method.value}.")


class LoggingSecurityLog:
    """CA-07 : une ligne JSON par événement (journal de la plateforme ; table d'audit avec le journal RH)."""

    def record(self, event: str, admin_id: str | None, **details: str) -> None:
        security_logger.info(json.dumps({"event": event, "admin_id": admin_id, **details}, ensure_ascii=False))
