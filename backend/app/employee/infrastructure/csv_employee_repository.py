"""Lecture de la source de référence `vault-employee-list_*.csv` (lecture seule).

- encodage UTF-8 avec BOM, séparateur virgule ;
- seuls les employés `active = true` sont conservés (D-01) ;
- seules les colonnes de la liste blanche sont lues (PRD §7.2, AD-08) ;
- dates au format MM/JJ/AAAA.
"""

import csv
from datetime import date, datetime
from pathlib import Path

from app.employee.domain.employee import Employee

_TEXT_COLUMNS = {
    "id": "id",
    "employee_code": "employee_code",
    "last_name": "last_name",
    "first_name": "first_name",
    "gender": "gender",
    "agency_code": "agency_code",
    "department": "department",
    "position": "position",
    "grade": "grade",
    "level": "level",
    "contract_nature": "contract_nature",
    "telephone_number": "telephone_number",
    "email_address": "email_address",
    "address_line_1": "address_line_1",
}


def _parse_date(value: str) -> date | None:
    value = value.strip()
    return datetime.strptime(value, "%m/%d/%Y").date() if value else None


def _to_employee(row: dict[str, str]) -> Employee:
    values = {attribute: (row.get(column) or "").strip() for attribute, column in _TEXT_COLUMNS.items()}
    return Employee(
        **values,
        birth_date=_parse_date(row["date_of_birth"]),
        hire_date=_parse_date(row.get("date_of_hire") or ""),
    )


class CsvEmployeeRepository:
    def __init__(self, csv_path: Path) -> None:
        self._employees = {employee.id: employee for employee in self._load(csv_path)}

    @staticmethod
    def _load(csv_path: Path) -> list[Employee]:
        with csv_path.open(encoding="utf-8-sig", newline="") as file:
            return [
                _to_employee(row)
                for row in csv.DictReader(file)
                if (row.get("active") or "").strip().lower() == "true"
            ]

    def get(self, employee_id: str) -> Employee | None:
        return self._employees.get(employee_id)

    def list_all(self) -> list[Employee]:
        return list(self._employees.values())
