"""Composition root : seul endroit qui instancie les adaptateurs d'infrastructure
et les relie aux cas d'utilisation (docs/03-plan-implementation.md §1.1).

Les cas d'utilisation sont créés à la demande : remplacer un adaptateur
(ex. `container.clock` dans un test) est pris en compte immédiatement.
"""

from datetime import timedelta

from app.admin.application.list_employees import ListEmployees
from app.auth.application.sessions import SessionService
from app.auth.application.use_cases import IdentifyEmployee, LoginAdmin, LoginEmployee, RegisterPassword
from app.auth.domain.model import SubjectType
from app.auth.infrastructure.argon2_hasher import Argon2PasswordHasher
from app.auth.infrastructure.sql_repositories import SqlAccountRepository, SqlSessionRepository
from app.config import Settings
from app.document.application.use_cases import DeleteDocument, GetMyDocumentFile, ListMyDocuments, UploadDocument
from app.document.infrastructure.local_file_storage import LocalFileStorage
from app.document.infrastructure.sql_document_repository import SqlDocumentRepository
from app.employee.application.get_profile import GetEmployeeProfile
from app.employee.infrastructure.csv_employee_repository import CsvEmployeeRepository
from app.shared.infrastructure.clock import SystemClock
from app.shared.infrastructure.database import Database
from app.update.application.use_cases import GetEditableFields, GetMyUpdate, RecordDecision, SaveDraft, SubmitUpdate
from app.update.infrastructure.sql_update_repository import SqlUpdateRepository


class Container:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        settings.acme_data_dir.mkdir(parents=True, exist_ok=True)
        settings.documents_dir.mkdir(parents=True, exist_ok=True)

        self.database = Database(settings.database_url)
        self.database.create_schema()

        self.clock = SystemClock()
        self.employees = CsvEmployeeRepository(settings.acme_csv_path)
        self.accounts = SqlAccountRepository(self.database)
        self.sessions = SqlSessionRepository(self.database)
        self.updates = SqlUpdateRepository(self.database)
        self.documents = SqlDocumentRepository(self.database)
        self.file_storage = LocalFileStorage(settings.documents_dir)
        self.password_hasher = Argon2PasswordHasher()

    # --- auth ---------------------------------------------------------------

    def session_service(self) -> SessionService:
        durations = {
            SubjectType.EMPLOYEE: timedelta(minutes=self.settings.employee_session_minutes),
            SubjectType.ADMIN: timedelta(minutes=self.settings.admin_session_minutes),
        }
        return SessionService(self.sessions, self.clock, durations)

    def identify_employee(self) -> IdentifyEmployee:
        return IdentifyEmployee(self.employees, self.updates, self.accounts)

    def register_password(self) -> RegisterPassword:
        return RegisterPassword(self.employees, self.updates, self.accounts, self.password_hasher, self.session_service())

    def login_employee(self) -> LoginEmployee:
        return LoginEmployee(
            self.employees, self.updates, self.accounts, self.password_hasher, self.session_service(), self.clock
        )

    def login_admin(self) -> LoginAdmin:
        return LoginAdmin(
            self.settings.admin_username,
            self.settings.admin_password_hash,
            self.password_hasher,
            self.session_service(),
        )

    # --- employee / update ----------------------------------------------------

    def get_employee_profile(self) -> GetEmployeeProfile:
        return GetEmployeeProfile(self.employees, self.updates)

    def get_my_update(self) -> GetMyUpdate:
        return GetMyUpdate(self.updates)

    def get_editable_fields(self) -> GetEditableFields:
        return GetEditableFields(self.employees, self.updates)

    def record_decision(self) -> RecordDecision:
        return RecordDecision(self.updates, self.clock)

    def save_draft(self) -> SaveDraft:
        return SaveDraft(self.employees, self.updates, self.clock)

    def submit_update(self) -> SubmitUpdate:
        return SubmitUpdate(self.updates, self.clock)

    # --- admin ----------------------------------------------------------------

    def list_employees(self) -> ListEmployees:
        return ListEmployees(self.employees, self.updates)

    def close(self) -> None:
        self.database.dispose()

    # --- document -------------------------------------------------------------

    def upload_document(self) -> UploadDocument:
        return UploadDocument(
            self.updates,
            self.documents,
            self.file_storage,
            self.clock,
            max_bytes=self.settings.max_upload_mb * 1024 * 1024,
            max_documents=self.settings.max_documents_per_employee,
        )

    def delete_document(self) -> DeleteDocument:
        return DeleteDocument(self.updates, self.documents, self.file_storage)

    def get_my_document_file(self) -> GetMyDocumentFile:
        return GetMyDocumentFile(self.documents, self.file_storage)

    def list_my_documents(self) -> ListMyDocuments:
        return ListMyDocuments(self.documents)
