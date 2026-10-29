"""US-1024 : le relevé PER entre deux dates (version du directeur du 2026-10-29 : `filtrer_releve`, `rendre_releve_pdf`).

Les deux jours arrivent du navigateur au format AAAA-MM-JJ. Sont gardées les photos dont la date du rapport tombe
dans l'intervalle, bornes comprises, de la plus ancienne à la plus récente ; une photo sans date n'est jamais retenue
et un mois absent n'est pas inventé.
"""

from dataclasses import dataclass
from datetime import date

from app.per.domain.statement import PerSnapshot, date_fr
from app.shared.domain.errors import InvalidInput


class UnreadableDate(InvalidInput):
    code = "UNREADABLE_DATE"
    message = "Date illisible."


class StartAfterEnd(InvalidInput):
    code = "START_AFTER_END"
    message = "La date de début est postérieure à la date de fin."


def day_iso(value: str) -> str:
    """« 2026-01-31 » tel quel s'il désigne un vrai jour ; sinon `UnreadableDate`."""
    parts = str(value or "").strip().split("-")
    if len(parts) != 3 or len(parts[0]) != 4 or not all(part.isdigit() for part in parts):
        raise UnreadableDate()
    try:
        return date(int(parts[0]), int(parts[1]), int(parts[2])).isoformat()
    except ValueError:
        raise UnreadableDate() from None


def statement_between(photos: tuple[PerSnapshot, ...], start: str, end: str) -> tuple[PerSnapshot, ...]:
    start, end = day_iso(start), day_iso(end)
    if start > end:
        raise StartAfterEnd()
    kept = [photo for photo in photos if photo.reported_on and start <= photo.reported_on <= end]
    return tuple(sorted(kept, key=lambda photo: (photo.reported_on, photo.period)))


def statement_filename(start: str, end: str) -> str:
    return f"Releve-PER-{start}-au-{end}.pdf"


@dataclass(frozen=True)
class StatementSheet:
    employee_code: str
    name: str
    start: str
    end: str
    photos: tuple[PerSnapshot, ...]

    @property
    def period_label(self) -> str:
        return f"Du {date_fr(self.start)} au {date_fr(self.end)}"
