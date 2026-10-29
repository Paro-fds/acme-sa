from typing import Protocol

from app.per.domain.payslip_sheet import PayslipSheet
from app.per.domain.statement_period import StatementSheet


class PerSourceUnavailable(Exception):
    """Le stockage des balances ne répond pas (panne, droits) ; différent d'un objet absent."""


class PerSource(Protocol):
    """US-1012 : les balances PER déposées par l'export Shivam ; lecture seule."""

    def read(self, key: str) -> dict | None:
        """Le JSON de la clé ; rien si l'objet n'existe pas ; `PerSourceUnavailable` si le stockage ne répond pas."""
        ...


class PayslipRenderer(Protocol):
    """US-1022 : met une fiche de paie en page, au format du directeur (HTML imprimable)."""

    def render(self, sheet: PayslipSheet) -> str: ...


class StatementRenderer(Protocol):
    """US-1024 : met le relevé PER entre deux dates en page (PDF)."""

    def render(self, sheet: StatementSheet) -> bytes: ...
