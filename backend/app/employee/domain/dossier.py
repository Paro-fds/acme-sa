"""US-201, US-202 : ce que le profil lit du dossier saisi par l'employé (module `dossier`)."""

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class DossierSummary:
    done: set[str] = field(default_factory=set)
    """Éléments complets de RG-01 (clés de `completion.ELEMENTS`)."""
    telephone: str | None = None
    address: str | None = None
    email: str | None = None
    """Valeurs saisies ou confirmées ; `None` : l'employé ne les a pas encore confirmées."""


class DossierReader(Protocol):
    def execute(self, employee_id: str) -> DossierSummary: ...
