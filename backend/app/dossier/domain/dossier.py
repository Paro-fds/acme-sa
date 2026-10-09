"""US-202 : dossier saisi par l'employé (modèle de données §4.1 → §4.3, §4.6)."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum


class Information(StrEnum):
    """Les informations du verrou que l'employé saisit lui-même (les confirmations d'agence, poste et
    date d'embauche arrivent avec US-203)."""

    TELEPHONE = "telephone"
    ADDRESS = "address"
    EMAIL = "email"
    EMERGENCY_CONTACT = "emergency_contact"
    EDUCATION_LEVEL = "education_level"


class Gesture(StrEnum):
    """Modèle de données §4.3 : saisie, modification, confirmation sans changement."""

    ENTRY = "ENTRY"
    CHANGE = "CHANGE"
    CONFIRMATION = "CONFIRMATION"


NO_EMAIL = "Pas d'adresse email"
"""Valeur inscrite dans l'historique quand l'employé coche « Je n'ai pas d'adresse email »."""


@dataclass(frozen=True)
class EmergencyContact:
    name: str
    relationship: str
    telephone: str

    def as_text(self) -> str:
        return f"{self.name} ({self.relationship}) {self.telephone}"


@dataclass
class Dossier:
    """Une ligne par employé : ce qu'il a saisi ou confirmé. `None` = pas encore renseigné."""

    employee_id: str
    telephone: str | None = None
    address: str | None = None
    email: str | None = None
    no_email: bool = False
    education_level: str | None = None
    emergency_contact: EmergencyContact | None = None

    def value_of(self, information: Information) -> str | None:
        """Valeur telle qu'inscrite dans l'historique des confirmations."""
        if information == Information.EMAIL and self.no_email:
            return NO_EMAIL
        if information == Information.EMERGENCY_CONTACT:
            return self.emergency_contact.as_text() if self.emergency_contact else None
        return getattr(self, information.value)

    def done(self) -> set[str]:
        """Informations complètes (RG-02) : remplies, ou « pas d'adresse email » pour l'email."""
        return {information.value for information in Information if self.value_of(information)}


@dataclass(frozen=True)
class Confirmation:
    """Une ligne à chaque saisie, modification ou confirmation ; jamais réécrite (EF-209)."""

    employee_id: str
    information: str
    gesture: Gesture
    old_value: str | None
    new_value: str
    at: datetime
    author: str = "EMPLOYEE"


def gesture(previous: str | None, new: str) -> Gesture:
    if not previous:
        return Gesture.ENTRY
    return Gesture.CONFIRMATION if previous == new else Gesture.CHANGE


class ConsentSubject(StrEnum):
    INFORMATION_NOTICE = "INFORMATION_NOTICE"
    WHATSAPP = "WHATSAPP"


NOTICE_VERSION = "2026-10-08-projet"
"""Version de la mention d'information acceptée (M-06). ❓ Texte rédigé par le développeur, à valider par la DRH."""


@dataclass(frozen=True)
class Consent:
    employee_id: str
    subject: ConsentSubject
    given: bool
    at: datetime
    text_version: str = NOTICE_VERSION


@dataclass(frozen=True)
class ConsentState:
    information_notice_at: datetime | None = None
    whatsapp: bool | None = None

    @classmethod
    def of(cls, consents: list[Consent]) -> "ConsentState":
        """État courant : premier accord à la mention (une seule fois), dernier choix WhatsApp."""
        notice = next((c.at for c in consents if c.subject == ConsentSubject.INFORMATION_NOTICE and c.given), None)
        whatsapp = [c.given for c in consents if c.subject == ConsentSubject.WHATSAPP]
        return cls(notice, whatsapp[-1] if whatsapp else None)


@dataclass
class ConfirmationDates:
    """Date de dernière confirmation de chaque information : calculée, jamais stockée (§4.3)."""

    latest: dict[str, datetime] = field(default_factory=dict)

    @classmethod
    def of(cls, confirmations: list[Confirmation]) -> "ConfirmationDates":
        latest: dict[str, datetime] = {}
        for confirmation in confirmations:
            if confirmation.information not in latest or confirmation.at > latest[confirmation.information]:
                latest[confirmation.information] = confirmation.at
        return cls(latest)
