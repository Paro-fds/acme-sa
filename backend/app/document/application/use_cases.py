import re
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from app.document.domain.document import Document, DocumentType
from app.document.domain.errors import DocumentLimitReached, DocumentNotFound, FileTooLarge
from app.document.domain.files import SIGNATURE_LENGTH, detect_file_kind
from app.document.domain.ports import DocumentRepository, FileStorage
from app.shared.domain.clock import Clock
from app.update.domain.errors import UpdateAlreadySubmitted, UpdateNotStarted
from app.update.domain.repository import UpdateRepository

MAX_NAME_LENGTH = 200


@dataclass(frozen=True)
class DocumentView:
    id: str
    document_type: str
    type_label: str
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


def document_view(document: Document) -> DocumentView:
    return DocumentView(
        id=document.id,
        document_type=document.document_type.value,
        type_label=document.document_type.label,
        original_name=document.original_name,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        uploaded_at=document.uploaded_at,
    )


def display_name(raw: str | None, extension: str) -> str:
    """Nom d'origine, conservé pour l'affichage uniquement : sans chemin, ni caractères de contrôle."""
    name = re.split(r"[\\/]", raw or "")[-1]
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    return name[-MAX_NAME_LENGTH:] or f"document{extension}"


def ensure_update_open(updates: UpdateRepository, employee_id: str) -> None:
    """Les documents se gèrent pendant la mise à jour : après un « Oui » et avant la soumission (D-04)."""
    update = updates.get_for_employee(employee_id)
    if update is None or not update.accepted:
        raise UpdateNotStarted()
    if update.is_submitted:
        raise UpdateAlreadySubmitted()


class UploadDocument:
    """US-13 : ajout d'un document (PDF, JPG, PNG) au profil de l'employé."""

    def __init__(
        self,
        updates: UpdateRepository,
        documents: DocumentRepository,
        storage: FileStorage,
        clock: Clock,
        max_bytes: int,
        max_documents: int,
        new_id: Callable[[], str] = lambda: uuid.uuid4().hex,
    ) -> None:
        self._updates = updates
        self._documents = documents
        self._storage = storage
        self._clock = clock
        self._max_bytes = max_bytes
        self._max_documents = max_documents
        self._new_id = new_id

    def execute(self, employee_id: str, document_type: str | None, filename: str | None, content: bytes) -> DocumentView:
        ensure_update_open(self._updates, employee_id)
        kind_of_document = DocumentType.parse(document_type)
        if len(content) > self._max_bytes:
            raise FileTooLarge(
                f"Fichier trop volumineux ({self._max_bytes // (1024 * 1024)} Mo maximum).", field="file"
            )
        kind = detect_file_kind(filename or "", content[:SIGNATURE_LENGTH])
        if len(self._documents.list_for_employee(employee_id)) >= self._max_documents:
            raise DocumentLimitReached(f"Nombre maximum de documents atteint ({self._max_documents}).")

        document_id = self._new_id()
        document = Document(
            id=document_id,
            employee_id=employee_id,
            document_type=kind_of_document,
            original_name=display_name(filename, kind.extension),
            stored_name=f"{document_id}{kind.extension}",
            content_type=kind.content_type,
            size_bytes=len(content),
            uploaded_at=self._clock.now(),
        )
        self._storage.save(document.storage_key, content)
        try:
            self._documents.add(document)
        except Exception:
            self._storage.delete(document.storage_key)
            raise
        return document_view(document)


class DeleteDocument:
    """US-14 : suppression d'un document de l'employé, tant que la mise à jour n'est pas soumise."""

    def __init__(self, updates: UpdateRepository, documents: DocumentRepository, storage: FileStorage) -> None:
        self._updates = updates
        self._documents = documents
        self._storage = storage

    def execute(self, employee_id: str, document_id: str) -> None:
        document = self._documents.get(document_id)
        # Le document d'un autre employé est traité comme inexistant : rien ne révèle son existence.
        if document is None or document.employee_id != employee_id:
            raise DocumentNotFound()
        ensure_update_open(self._updates, employee_id)
        self._documents.delete(document.id)
        self._storage.delete(document.storage_key)


@dataclass(frozen=True)
class DocumentFile:
    original_name: str
    content_type: str
    content: bytes


class GetMyDocumentFile:
    """US-07 : contenu d'un document de l'employé connecté (consultable même après la soumission)."""

    def __init__(self, documents: DocumentRepository, storage: FileStorage) -> None:
        self._documents = documents
        self._storage = storage

    def execute(self, employee_id: str, document_id: str) -> DocumentFile:
        document = self._documents.get(document_id)
        if document is None or document.employee_id != employee_id:
            raise DocumentNotFound()
        try:
            content = self._storage.open(document.storage_key)
        except FileNotFoundError:
            raise DocumentNotFound() from None
        return DocumentFile(document.original_name, document.content_type, content)


class ListMyDocuments:
    """Documents de l'employé connecté (étape 2, vérification, « Mes documents »)."""

    def __init__(self, documents: DocumentRepository) -> None:
        self._documents = documents

    def execute(self, employee_id: str) -> list[DocumentView]:
        return [document_view(document) for document in self._documents.list_for_employee(employee_id)]
