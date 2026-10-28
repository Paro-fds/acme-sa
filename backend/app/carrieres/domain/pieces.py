"""US-1007 : une pièce déposée par l'employé entre dans Carrières « à compléter » (dictionnaire de Carrières).

Comme un dépôt de lot : `type_document` vide, date du dépôt comme `date_document`, aucune qualification
(alignement, catégorie, poste, lieu vides). La DRH la qualifie ensuite dans Carrières.
"""

from dataclasses import dataclass
from datetime import date, datetime

from app.shared.domain.errors import Conflict, InvalidInput, NotFound

MAX_BYTES = 4 * 1024 * 1024
"""4 Mo au plus (décision du 2026-10-27) ; le scan est stocké dans la base de Carrières."""
TO_COMPLETE = "a_completer"
TITLE_MAX = 300


class PieceTooLarge(InvalidInput):
    code = "FILE_TOO_LARGE"
    message = "Le fichier dépasse 4 Mo. Réduisez-le, ou photographiez la pièce à nouveau."

    def __init__(self) -> None:
        super().__init__(field="file")


class EmptyPiece(InvalidInput):
    code = "EMPTY_FILE"
    message = "Le fichier est vide. Choisissez à nouveau la pièce."

    def __init__(self) -> None:
        super().__init__(field="file")


class DuplicatePiece(Conflict):
    code = "DUPLICATE_PIECE"
    message = "Vous avez déjà déposé ce fichier. Il est dans vos pièces."


class NotInCarrieres(Conflict):
    code = "CONTACT_HR"
    message = "Votre dossier n'est pas encore ouvert dans Carrières. Contactez la DRH."


@dataclass(frozen=True)
class CarrieresEmployee:
    id: int
    code: str


@dataclass(frozen=True)
class NewPiece:
    employee: CarrieresEmployee
    depositor_name: str
    depositor_email: str
    title: str
    document_date: date
    deposited_at: datetime
    fingerprint: str
    content_type: str
    content: bytes


def piece_title(typed: str | None, file_name: str | None, today: date) -> str:
    """L'intitulé saisi, sinon le nom du fichier sans extension, sinon « Pièce déposée le JJ/MM/AAAA » (Q6)."""
    title = " ".join((typed or "").split())
    if not title:
        base = (file_name or "").replace("\\", "/").rsplit("/", 1)[-1]
        title = " ".join(base.rsplit(".", 1)[0].replace("_", " ").split()) if "." in base else " ".join(base.split())
    return (title or f"Pièce déposée le {today:%d/%m/%Y}")[:TITLE_MAX]


# --- US-1008 : suivre mes pièces ------------------------------------------------------------------------

FORMATIONS = {
    "doctorat": "Doctorat",
    "master": "Master",
    "licence": "Licence",
    "baccalaureat": "Baccalauréat",
    "diplome_technique": "Diplôme technique",
    "diplome": "Diplôme",
    "certificat": "Certificat",
    "attestation_generale": "Attestation",
    "attestation": "Attestation de suivi",
}
"""Nomenclature `type_document` de Carrières (§ 14), famille formation, dans l'ordre du plus haut diplôme."""

STATUS_LABELS = {"a_completer": "À compléter", "en_attente": "En attente", "valide": "Approuvée", "refuse": "Refusée"}


@dataclass(frozen=True)
class MyPiece:
    """Une formation du dossier Carrières, ou une pièce déposée pas encore qualifiée par la DRH."""

    id: int
    title: str
    type_label: str | None
    status: str
    status_label: str
    document_date: date
    deposited_at: datetime
    refusal_reason: str | None
    has_file: bool


@dataclass(frozen=True)
class PieceFile:
    content_type: str
    content: bytes


class PieceNotFound(NotFound):
    code = "PIECE_NOT_FOUND"
    message = "Cette pièce est introuvable."
