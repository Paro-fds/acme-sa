from datetime import datetime
from typing import Protocol

from app.referential.domain.units import Attachment, Mapping, ReferentialFile, Unit


class ReferentialFileReader(Protocol):
    def read(self, content: bytes) -> ReferentialFile:
        """Lit le classeur ; lève `UnreadableReferentialFile` s'il ne peut pas être lu."""
        ...


class ReferentialRepository(Protocol):
    def units(self) -> dict[str, Unit]: ...

    def current_attachments(self) -> dict[str, Attachment]:
        """Rattachement en cours de chaque unité (fin vide)."""
        ...

    def attachments_of(self, unit_code: str) -> list[Attachment]:
        """Historique des rattachements d'une unité, du plus ancien au plus récent."""
        ...

    def mappings(self) -> list[Mapping]: ...

    def save_import(
        self,
        units: list[Unit],
        closed: list[Attachment],
        opened: list[Attachment],
        mappings: list[Mapping],
        source: str,
        imported_at: datetime,
    ) -> None:
        """Enregistre tout l'import en une seule transaction : rien n'est gardé si une écriture échoue."""
        ...
