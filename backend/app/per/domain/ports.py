from typing import Protocol

from app.per.domain.payslip_sheet import PayslipSheet


class PerSourceUnavailable(Exception):
    """Le stockage des balances ne répond pas (panne, droits) ; différent d'un objet absent."""


class PerSource(Protocol):
    """US-1012 : les balances PER déposées par l'export Shivam ; lecture seule."""

    def read(self, key: str) -> dict | None:
        """Le JSON de la clé ; rien si l'objet n'existe pas ; `PerSourceUnavailable` si le stockage ne répond pas."""
        ...


class PayslipRenderer(Protocol):
    """US-1021 : met une fiche de paie en page (PDF)."""

    def render(self, sheet: PayslipSheet) -> bytes: ...
