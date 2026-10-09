from typing import Protocol

from app.dossier.domain.dossier import Confirmation, Consent, Dossier
from app.dossier.domain.hr_information import HrValues, Report


class DossierRepository(Protocol):
    def get(self, employee_id: str) -> Dossier | None: ...

    def save(self, dossier: Dossier, confirmations: list[Confirmation]) -> None:
        """Enregistre le dossier et ajoute les confirmations, dans une même transaction."""

    def confirmations(self, employee_id: str) -> list[Confirmation]:
        """Historique, du plus ancien au plus récent."""

    def consents(self, employee_id: str) -> list[Consent]:
        """Consentements, du plus ancien au plus récent."""

    def add_consents(self, consents: list[Consent]) -> None: ...

    def add_confirmation(self, confirmation: Confirmation) -> None: ...

    def reports(self, employee_id: str) -> list[Report]:
        """Signalements (US-203), du plus ancien au plus récent."""

    def add_report(self, report: Report) -> None: ...


class ExportContact(Protocol):
    """Coordonnées actuelles de l'export (et du dernier envoi du MVP) : proposées tant que l'employé
    ne les a pas confirmées. Clés : `telephone`, `address`, `email`."""

    def execute(self, employee_id: str) -> dict[str, str]: ...


class HrInformationSource(Protocol):
    """US-203 : agence (libellé officiel), poste, date d'embauche et date de naissance, tels que le système RH les connaît."""

    def execute(self, employee_id: str) -> HrValues: ...
