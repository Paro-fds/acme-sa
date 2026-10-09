"""US-201 CA-01, CA-03 : affectation de l'employé avec les libellés officiels du référentiel (US-501)."""

from typing import Protocol


class AffectationLabels(Protocol):
    agency: str | None
    region: str | None
    direction: str | None
    """None : valeur de l'export sans correspondance, l'employé voit « Unité à confirmer » (RG-17)."""


class UnitDirectory(Protocol):
    """Port vers le référentiel des unités ; le module employé ne lit jamais ses tables."""

    def execute(self, agency_value: str, department_value: str) -> AffectationLabels: ...
