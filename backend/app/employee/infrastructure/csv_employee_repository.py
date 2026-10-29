"""Lecture de la copie Vault des employés `vault-employee-list.csv` (lecture seule).

- encodage UTF-8 avec BOM, séparateur virgule ou point-virgule (US-1001, comme Carrières) ;
- seuls les employés actifs sont conservés (D-01) : `active` vaut true, 1, oui, vrai, yes ou y ;
- seules les colonnes de la liste blanche sont lues (PRD §7.2, AD-08) ;
- dates au format MM/JJ/AAAA ;
- la copie est relue quand sa version change, vérifiée au plus toutes les 5 minutes (US-1001).
"""

import csv
import io
import logging
import threading
import time
from collections.abc import Callable
from datetime import date, datetime
from pathlib import Path

from app.employee.domain.employee import Employee
from app.employee.infrastructure.vault_source import LocalVaultFile

logger = logging.getLogger(__name__)

REFRESH_SECONDS = 300
ACTIVE_VALUES = {"true", "1", "oui", "vrai", "yes", "y"}

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


def _parse(content: bytes) -> dict[str, Employee]:
    text = content.decode("utf-8-sig")
    header = text.split("\n", 1)[0]
    delimiter = ";" if header.count(";") > header.count(",") else ","
    rows = csv.DictReader(io.StringIO(text, newline=""), delimiter=delimiter)
    employees = [_to_employee(row) for row in rows if (row.get("active") or "").strip().lower() in ACTIVE_VALUES]
    return {employee.id: employee for employee in employees}


class CsvEmployeeRepository:
    def __init__(
        self,
        source,
        *,
        refresh_seconds: int = REFRESH_SECONDS,
        monotonic: Callable[[], float] = time.monotonic,
    ) -> None:
        self._source = LocalVaultFile(source) if isinstance(source, Path) else source
        self._refresh_seconds = refresh_seconds
        self._monotonic = monotonic
        self._lock = threading.Lock()
        # Première lecture : une erreur empêche le portail de démarrer (US-1001 CA-04).
        content, self._version = self._source.read()
        self._employees = _parse(content)
        self._checked_at = monotonic()

    def _refresh_if_due(self) -> None:
        now = self._monotonic()
        if now - self._checked_at < self._refresh_seconds:
            return
        with self._lock:
            if now - self._checked_at < self._refresh_seconds:
                return
            self._checked_at = now
            try:
                if self._source.version() == self._version:
                    return
                content, version = self._source.read()
                self._employees, self._version = _parse(content), version
            except Exception as error:  # noqa: BLE001 — la dernière liste lue reste en service
                # Aucune donnée d'employé dans le journal : seulement la nature de l'erreur.
                logger.warning("Copie Vault illisible, dernière liste conservée (%s).", type(error).__name__)

    def get(self, employee_id: str) -> Employee | None:
        self._refresh_if_due()
        return self._employees.get(employee_id)

    def list_all(self) -> list[Employee]:
        self._refresh_if_due()
        return list(self._employees.values())
