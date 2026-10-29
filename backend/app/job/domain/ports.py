from typing import Protocol

from app.job.domain.application import JobApplication
from app.job.domain.opening import JobOpening


class OpeningRepository(Protocol):
    def add(self, opening: JobOpening) -> JobOpening:
        """Enregistre un nouveau poste et le renvoie avec son identifiant."""
        ...

    def get(self, opening_id: int) -> JobOpening | None: ...

    def save(self, opening: JobOpening) -> None:
        """Enregistre la fiche, ses nouvelles étapes et ses nouvelles traces de critères."""
        ...

    def code_taken(self, code: str, except_id: int | None = None) -> bool: ...

    def list_all(self) -> list[JobOpening]:
        """Du plus récent au plus ancien."""
        ...


class ApplicationRepository(Protocol):
    """US-902 : candidatures ; aucune n'est jamais supprimée (RG-74)."""

    def add(self, application: JobApplication) -> JobApplication: ...

    def get(self, application_id: int) -> JobApplication | None: ...

    def save(self, application: JobApplication) -> None:
        """Enregistre l'étape en cours et ajoute les nouvelles étapes de l'historique."""
        ...

    def for_employee(self, employee_id: str) -> list[JobApplication]:
        """Du plus récent au plus ancien."""
        ...

    def for_opening(self, opening_id: int) -> list[JobApplication]:
        """Du plus ancien au plus récent (ordre d'arrivée)."""
        ...
