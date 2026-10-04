from typing import Protocol

from app.document.domain.document import Document


class DocumentRepository(Protocol):
    def list_for_employee(self, employee_id: str) -> list[Document]:
        """Documents de l'employé, du plus ancien au plus récent."""
        ...

    def get(self, document_id: str) -> Document | None: ...

    def add(self, document: Document) -> None: ...

    def delete(self, document_id: str) -> None: ...


class FileStorage(Protocol):
    """Stockage des fichiers (Solution Design §9) : disque local pour le MVP."""

    def save(self, key: str, content: bytes) -> None: ...

    def open(self, key: str) -> bytes: ...

    def delete(self, key: str) -> None: ...
