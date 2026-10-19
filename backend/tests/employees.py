"""Employés fictifs du CSV de test (docs/03-plan-implementation.md §4.1)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TestEmployee:
    __test__ = False  # pas une classe de test pour pytest

    id: str
    employee_code: str
    last_name: str
    first_name: str
    birth_date: str  # format API AAAA-MM-JJ

    def identity(self, **overrides) -> dict:
        return {
            "last_name": self.last_name,
            "first_name": self.first_name,
            "birth_date": self.birth_date,
            **overrides,
        }


EMP_A = TestEmployee("1001", "AC-1001", "JOSEPH", "Jean", "1996-03-15")
EMP_H1 = TestEmployee("1002", "AC-1002", "PIERRE", "Marie", "1990-07-02")
EMP_H2 = TestEmployee("1003", "AC-1003", "PIERRE", "Marie", "1985-11-20")
EMP_D1 = TestEmployee("1004", "AC-1004", "LOUIS", "Paul", "1988-01-10")
EMP_D2 = TestEmployee("1005", "AC-1005", "LOUIS", "Paul", "1988-01-10")
EMP_I = TestEmployee("1006", "AC-1006", "CHARLES", "Anne", "1992-05-05")
EMP_E = TestEmployee("1007", "AC-1007", "ÉTIENNE", "Rosé", "1979-09-30")
EMP_B = TestEmployee("1008", "AC-1008", "BAPTISTE", "Marc", "2000-12-01")

ACTIVE_EMPLOYEES = [EMP_A, EMP_H1, EMP_H2, EMP_D1, EMP_D2, EMP_E, EMP_B]

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin-Test-2026"

SECRET_MARKER = "FAKE-SECRET"
"""Valeur placée dans toutes les colonnes exclues du CSV de test : elle ne doit jamais sortir de l'API."""
