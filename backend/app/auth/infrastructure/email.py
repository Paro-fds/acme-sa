"""US-1003 : envoi des courriels de la connexion.

- `SesEmailSender` : Amazon SES (API v2), mêmes procédés que SISA (doc PAM, « Canal e-mail ») ;
- `LocalEmailSender` : poste du développeur et tests, rien ne part, les messages restent en mémoire ;
- `UnconfiguredEmailSender` : ailleurs sans SES, aucun envoi possible (démonstrateur fermé aux employés).

Le journal ne garde que le destinataire masqué et l'objet, jamais le texte (qui peut contenir un code).
"""

import logging
from dataclasses import dataclass
from pathlib import Path

from app.auth.domain.mfa import MfaMethod, mask_destination
from app.auth.domain.ports import EmailNotSent

logger = logging.getLogger("acme.security")


OTP_TEMPLATE = Path(__file__).parent / "templates" / "pam_otp_email.html"


def load_otp_template() -> str:
    """US-1016 : modèle HTML du code, repris du directeur (`pam/pam/pam_otp_email.html`)."""
    return OTP_TEMPLATE.read_text(encoding="utf-8")


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    body: str
    html: str | None = None


class LocalEmailSender:
    def __init__(self) -> None:
        self.outbox: list[EmailMessage] = []

    def send(self, to: str, subject: str, body: str, html: str | None = None) -> None:
        self.outbox.append(EmailMessage(to, subject, body, html))
        logger.info("Courriel « %s » pour %s (non envoyé, poste local)", subject, mask_destination(MfaMethod.EMAIL, to))


class UnconfiguredEmailSender:
    def send(self, to: str, subject: str, body: str, html: str | None = None) -> None:
        raise EmailNotSent("Aucun service d'envoi de courriel n'est configuré (SES_SENDER).")


class SesEmailSender:
    def __init__(self, client, sender: str, reply_to: str = "") -> None:
        self._client = client
        self._sender = sender
        self._reply_to = reply_to

    @classmethod
    def create(cls, sender: str, region: str, reply_to: str = "") -> "SesEmailSender":
        import boto3

        # Ni clé ni adresse : sur AWS, boto3 prend les droits du rôle d'exécution (`ses:SendEmail`).
        return cls(boto3.client("sesv2", region_name=region), sender, reply_to)

    def send(self, to: str, subject: str, body: str, html: str | None = None) -> None:
        content = {"Text": {"Data": body, "Charset": "UTF-8"}}
        if html:
            content["Html"] = {"Data": html, "Charset": "UTF-8"}
        extra = {"ReplyToAddresses": [self._reply_to]} if self._reply_to else {}
        try:
            self._client.send_email(
                FromEmailAddress=self._sender,
                Destination={"ToAddresses": [to]},
                Content={"Simple": {"Subject": {"Data": subject, "Charset": "UTF-8"}, "Body": content}},
                **extra,
            )
        except Exception as error:  # noqa: BLE001 — erreur de SES ou du réseau
            logger.warning("Courriel « %s » non envoyé par SES (%s)", subject, type(error).__name__)
            raise EmailNotSent(subject) from error
