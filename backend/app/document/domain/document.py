from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from app.document.domain.errors import InvalidDocumentType


class DocumentType(StrEnum):
    DIPLOME = "DIPLOME"
    CERTIFICAT = "CERTIFICAT"
    ATTESTATION = "ATTESTATION"
    AUTRE = "AUTRE"

    @property
    def label(self) -> str:
        return _LABELS[self]

    @classmethod
    def parse(cls, value: str | None) -> "DocumentType":
        try:
            return cls(value)
        except ValueError:
            raise InvalidDocumentType(field="document_type") from None


_LABELS = {
    DocumentType.DIPLOME: "Diplôme",
    DocumentType.CERTIFICAT: "Certificat",
    DocumentType.ATTESTATION: "Attestation",
    DocumentType.AUTRE: "Autre",
}


@dataclass(frozen=True)
class Document:
    """Document rattaché au profil de l'employé (SD-02), et non à la mise à jour."""

    id: str
    employee_id: str
    document_type: DocumentType
    original_name: str
    stored_name: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime

    @property
    def storage_key(self) -> str:
        """Emplacement dans le stockage : `<employee_id>/<uuid>.<ext>`."""
        return f"{self.employee_id}/{self.stored_name}"
