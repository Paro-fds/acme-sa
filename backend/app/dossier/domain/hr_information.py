"""US-203 : agence, poste et date d'embauche, que l'employé confirme ou signale sans jamais les modifier
(EF-203, EF-204 ; RG-03, RG-16 ; D-02 ; modèle de données §4.3, §4.4)."""

from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum

from app.dossier.domain.errors import InvalidDossierField


UNIT_TO_CONFIRM = "Unité à confirmer"
"""Agence sans correspondance dans le référentiel (RG-17), comme dans le profil (US-201)."""


class HrItem(StrEnum):
    """Clés des éléments de RG-01 (`completion.ELEMENTS`)."""

    AGENCY = "agency_confirmed"
    POSITION = "position_confirmed"
    HIRE_DATE = "hire_date_confirmed"


LABELS = {
    HrItem.AGENCY: "Agence d'affectation",
    HrItem.POSITION: "Poste actuel",
    HrItem.HIRE_DATE: "Date d'embauche",
}


@dataclass(frozen=True)
class HrValues:
    """Ce que le système RH connaît de l'employé (export, libellé officiel de l'agence s'il existe)."""

    agency: str | None
    position: str
    hire_date: date | None
    birth_date: date

    def value_of(self, item: HrItem) -> str:
        if item == HrItem.AGENCY:
            return self.agency or UNIT_TO_CONFIRM
        if item == HrItem.POSITION:
            return self.position
        return self.hire_date.strftime("%d/%m/%Y") if self.hire_date else ""


class ReportOrigin(StrEnum):
    EMPLOYEE = "EMPLOYEE"
    AUTOMATIC = "AUTOMATIC"
    """Contrôle de cohérence (RG-16) : n'est pas une réponse de l'employé."""


@dataclass(frozen=True)
class Report:
    """Signalement d'erreur (§4.4) : traité par les RH au lot 2 (US-403)."""

    employee_id: str
    information: str
    origin: ReportOrigin
    current_value: str
    indicated_value: str | None
    comment: str | None
    at: datetime
    status: str = "NEW"


def hired_too_young(birth: date, hire: date | None) -> bool:
    """RG-16 : embauche moins de 18 ans après la naissance (un 29 février compte jusqu'au 1er mars)."""
    if hire is None:
        return False
    try:
        adult = birth.replace(year=birth.year + 18)
    except ValueError:
        adult = date(birth.year + 18, 3, 1)
    return hire < adult


def hr_item(raw: str) -> HrItem | None:
    try:
        return HrItem(raw)
    except ValueError:
        return None


def clean_report(correct_value: str, comment: str) -> tuple[str, str | None]:
    """CA-03 : la bonne information est demandée ; la précision est facultative."""
    value = " ".join((correct_value or "").split())
    if not value:
        raise InvalidDossierField("Indiquez la bonne information pour que les RH puissent corriger.", field="correct_value")
    if len(value) > 200:
        raise InvalidDossierField("Raccourcissez la bonne information : 200 caractères au plus.", field="correct_value")
    note = " ".join((comment or "").split())
    if len(note) > 500:
        raise InvalidDossierField("Raccourcissez la précision : 500 caractères au plus.", field="comment")
    return value, note or None


def hr_status(item: HrItem, confirmed_at: datetime | None, reports: list[Report]) -> tuple[str, datetime | None]:
    """État d'une information : la dernière réponse de l'employé l'emporte (un signalement automatique n'en est pas une)."""
    reported = [r.at for r in reports if r.information == item.value and r.origin == ReportOrigin.EMPLOYEE]
    reported_at = max(reported) if reported else None
    if reported_at and (confirmed_at is None or reported_at >= confirmed_at):
        return "REPORTED", reported_at
    if confirmed_at:
        return "CONFIRMED", confirmed_at
    return "TO_CONFIRM", None


def hr_done(confirmed: set[str], reports: list[Report]) -> set[str]:
    """RG-03 : confirmé **ou** signalé par l'employé, le champ est complet."""
    reported = {r.information for r in reports if r.origin == ReportOrigin.EMPLOYEE}
    return {item.value for item in HrItem if item.value in confirmed or item.value in reported}
