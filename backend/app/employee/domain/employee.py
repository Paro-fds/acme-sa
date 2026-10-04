from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Employee:
    """Données de référence d'un employé actif (lecture seule, issues de la source ACME).

    Seules les colonnes autorisées par le PRD (§7.2) existent ici : les données
    financières et RH sensibles de la source ne sont jamais représentées.
    """

    id: str
    employee_code: str
    last_name: str
    first_name: str
    birth_date: date
    gender: str
    agency_code: str
    department: str
    position: str
    grade: str
    level: str
    contract_nature: str
    hire_date: date | None
    telephone_number: str
    email_address: str
    address_line_1: str
