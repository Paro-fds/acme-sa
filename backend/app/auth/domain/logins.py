"""US-605 CA-01 : chaque connexion d'un employé est enregistrée avec sa date (modèle de données §3)."""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class EmployeeLogin:
    employee_id: str
    at: datetime


class LoginJournal(Protocol):
    def record(self, login: EmployeeLogin) -> None: ...

    def all(self) -> list[EmployeeLogin]:
        """Du plus ancien au plus récent."""

    def since(self, moment: datetime) -> list[EmployeeLogin]: ...
