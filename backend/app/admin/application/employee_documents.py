from app.document.application.use_cases import DocumentFile, DocumentView, document_view
from app.document.domain.errors import DocumentNotFound
from app.document.domain.ports import DocumentRepository, FileStorage
from app.employee.domain.repository import EmployeeRepository, get_employee


class ListEmployeeDocuments:
    """US-21 : documents d'un employé actif, en lecture seule ; 404 pour un inactif ou un inconnu."""

    def __init__(self, employees: EmployeeRepository, documents: DocumentRepository) -> None:
        self._employees = employees
        self._documents = documents

    def execute(self, employee_id: str) -> list[DocumentView]:
        employee = get_employee(self._employees, employee_id)
        return [document_view(document) for document in self._documents.list_for_employee(employee.id)]


class GetEmployeeDocumentFile:
    """US-21 : contenu d'un document, pour l'administrateur (un employé inactif n'est plus consultable)."""

    def __init__(self, employees: EmployeeRepository, documents: DocumentRepository, storage: FileStorage) -> None:
        self._employees = employees
        self._documents = documents
        self._storage = storage

    def execute(self, document_id: str) -> DocumentFile:
        document = self._documents.get(document_id)
        if document is None or self._employees.get(document.employee_id) is None:
            raise DocumentNotFound()
        try:
            content = self._storage.open(document.storage_key)
        except FileNotFoundError:
            raise DocumentNotFound() from None
        return DocumentFile(document.original_name, document.content_type, content)
