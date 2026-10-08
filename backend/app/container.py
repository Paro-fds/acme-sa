"""Composition root : seul endroit qui instancie les adaptateurs d'infrastructure
et les relie aux cas d'utilisation (docs/03-plan-implementation.md §1.1).

Les cas d'utilisation sont créés à la demande : remplacer un adaptateur
(ex. `container.clock` dans un test) est pris en compte immédiatement.
"""

from datetime import timedelta

from app.admin.application.employee_documents import GetEmployeeDocumentFile, ListEmployeeDocuments
from app.admin.application.get_employee_folder import GetEmployeeFolder
from app.admin.application.get_statistics import GetStatistics
from app.admin.application.list_employees import ListEmployees
from app.admin.application.reset_access import ResetAccess
from app.auth.application.admin_mfa import (
    ConfirmMfaChange,
    ConfirmMfaSetup,
    GetMfaStatus,
    MfaCodes,
    ResetAdminMfa,
    SendMfaCode,
    StartMfaSetup,
    VerifyMfa,
)
from app.auth.application.sessions import SessionService
from app.auth.application.admin_accounts import (
    AddAdmin,
    ChangeAdminPassword,
    CreateFirstAdmin,
    DeleteAdmin,
    GetCurrentAdmin,
    ImportConfiguredAdmin,
    ListAdmins,
    LoginAdmin,
)
from app.auth.application.use_cases import LoginEmployee, RegisterPassword
from app.auth.domain.model import SubjectType
from app.auth.domain.mfa import MfaMethod
from app.auth.domain.network import parse_networks
from app.auth.infrastructure.argon2_hasher import Argon2PasswordHasher
from app.auth.infrastructure.mfa_adapters import (
    LocalOutboxCodeSender,
    LoggingSecurityLog,
    PyOtpTotpService,
    UnconfiguredCodeSender,
)
from app.auth.infrastructure.sql_repositories import SqlAccountRepository, SqlAdminAccountRepository, SqlSessionRepository
from app.career.application.use_cases import GetCareerFields, GetMyCareer
from app.career.infrastructure.sql_career_repository import SqlCareerRepository
from app.config import Settings
from app.document.application.use_cases import DeleteDocument, GetMyDocumentFile, ListMyDocuments, UploadDocument
from app.document.infrastructure.local_file_storage import LocalFileStorage
from app.document.infrastructure.remote_file_storage import S3FileStorage
from app.document.infrastructure.sql_document_repository import SqlDocumentRepository
from app.employee.application.get_profile import GetEmployeeProfile
from app.employee.infrastructure.csv_employee_repository import CsvEmployeeRepository
from app.shared.infrastructure.clock import SystemClock
from app.shared.infrastructure.database import Database
from app.update.application.use_cases import (
    DiscardUpdate,
    GetEditableFields,
    GetMyUpdate,
    RecordDecision,
    ReopenUpdate,
    SaveDraft,
    SubmitUpdate,
)
from app.update.infrastructure.sql_update_repository import SqlUpdateRepository


class Container:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        settings.acme_data_dir.mkdir(parents=True, exist_ok=True)
        settings.documents_dir.mkdir(parents=True, exist_ok=True)
        settings.career_dir.mkdir(parents=True, exist_ok=True)

        self.database = Database(settings.database_url)
        if settings.auto_create_schema:
            self.database.create_schema()

        self.clock = SystemClock()
        self.employees = CsvEmployeeRepository(settings.acme_csv_path)
        self.accounts = SqlAccountRepository(self.database)
        self.admin_accounts = SqlAdminAccountRepository(self.database)
        self.sessions = SqlSessionRepository(self.database)
        self.updates = SqlUpdateRepository(self.database)
        self.documents = SqlDocumentRepository(self.database)
        self.careers = SqlCareerRepository(self.database)
        self.file_storage = _file_storage(settings)
        self.password_hasher = Argon2PasswordHasher()
        self.totp = PyOtpTotpService()
        self.code_sender = LocalOutboxCodeSender() if settings.shows_local_codes else UnconfiguredCodeSender()
        self.security_log = LoggingSecurityLog()
        self.rh_networks = parse_networks(settings.rh_allowed_networks)

        # US-23 CA-03 : le compte de la configuration devient le premier administrateur en base.
        ImportConfiguredAdmin(
            self.admin_accounts, self.clock, settings.admin_username, settings.admin_password_hash
        ).execute()

    # --- auth ---------------------------------------------------------------

    def session_service(self) -> SessionService:
        durations = {
            SubjectType.EMPLOYEE: timedelta(minutes=self.settings.employee_session_minutes),
            SubjectType.ADMIN: timedelta(minutes=self.settings.admin_session_minutes),
            SubjectType.ADMIN_MFA: timedelta(minutes=10),
        }
        return SessionService(self.sessions, self.clock, durations)

    def register_password(self) -> RegisterPassword:
        return RegisterPassword(self.employees, self.updates, self.accounts, self.password_hasher, self.session_service())

    def login_employee(self) -> LoginEmployee:
        return LoginEmployee(
            self.employees, self.updates, self.accounts, self.password_hasher, self.session_service(), self.clock
        )

    def login_admin(self) -> LoginAdmin:
        return LoginAdmin(self.admin_accounts, self.password_hasher, self.session_service(), self.clock, self.mfa_codes())

    # --- double authentification RH (US-102) ---------------------------------------

    def mfa_codes(self) -> MfaCodes:
        return MfaCodes(
            self.admin_accounts,
            self.code_sender,
            self.totp,
            self.security_log,
            self.clock,
            show_codes=self.settings.shows_local_codes,
            methods=[MfaMethod(name) for name in self.settings.enabled_mfa_methods],
        )

    def get_mfa_status(self) -> GetMfaStatus:
        return GetMfaStatus(self.mfa_codes())

    def start_mfa_setup(self) -> StartMfaSetup:
        return StartMfaSetup(self.mfa_codes())

    def confirm_mfa_setup(self) -> ConfirmMfaSetup:
        return ConfirmMfaSetup(self.mfa_codes(), self.session_service())

    def send_mfa_code(self) -> SendMfaCode:
        return SendMfaCode(self.mfa_codes())

    def verify_mfa(self) -> VerifyMfa:
        return VerifyMfa(self.mfa_codes(), self.session_service())

    def confirm_mfa_change(self) -> ConfirmMfaChange:
        return ConfirmMfaChange(self.mfa_codes())

    def reset_admin_mfa(self) -> ResetAdminMfa:
        return ResetAdminMfa(self.mfa_codes(), self.session_service())

    def get_current_admin(self) -> GetCurrentAdmin:
        return GetCurrentAdmin(self.admin_accounts)

    def create_first_admin(self) -> CreateFirstAdmin:
        return CreateFirstAdmin(self.admin_accounts, self.password_hasher, self.clock)

    def list_admins(self) -> ListAdmins:
        return ListAdmins(self.admin_accounts)

    def add_admin(self) -> AddAdmin:
        return AddAdmin(self.admin_accounts, self.password_hasher, self.clock)

    def delete_admin(self) -> DeleteAdmin:
        return DeleteAdmin(self.admin_accounts, self.session_service())

    def change_admin_password(self) -> ChangeAdminPassword:
        return ChangeAdminPassword(self.admin_accounts, self.password_hasher, self.session_service())

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

    def reopen_update(self) -> ReopenUpdate:
        return ReopenUpdate(self.updates, self.clock)

    def discard_update(self) -> DiscardUpdate:
        return DiscardUpdate(self.updates, self.clock)

    # --- admin ----------------------------------------------------------------

    def get_statistics(self) -> GetStatistics:
        return GetStatistics(self.employees, self.updates)

    def get_employee_folder(self) -> GetEmployeeFolder:
        return GetEmployeeFolder(self.employees, self.updates, self.accounts)

    def list_employees(self) -> ListEmployees:
        return ListEmployees(self.employees, self.updates)

    def reset_access(self) -> ResetAccess:
        return ResetAccess(self.employees, self.accounts, self.session_service())

    def list_employee_documents(self) -> ListEmployeeDocuments:
        return ListEmployeeDocuments(self.employees, self.documents)

    def get_employee_document_file(self) -> GetEmployeeDocumentFile:
        return GetEmployeeDocumentFile(self.employees, self.documents, self.file_storage)

    def close(self) -> None:
        self.database.dispose()

    # --- career (V2) -----------------------------------------------------------

    def get_my_career(self) -> GetMyCareer:
        return GetMyCareer(self.careers, self.settings.max_career_entries_per_kind)

    def get_career_fields(self) -> GetCareerFields:
        return GetCareerFields(self.settings.max_career_entries_per_kind)

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


def _file_storage(settings: Settings):
    """US-001 : disque local sur le poste du développeur ; stockage distant une fois déployé (`STORAGE_BACKEND`)."""
    if settings.storage_backend == "s3":
        return S3FileStorage.create(
            settings.s3_bucket,
            settings.s3_region,
            settings.s3_endpoint_url,
            settings.s3_access_key_id,
            settings.s3_secret_access_key,
        )
    return LocalFileStorage(settings.documents_dir)
