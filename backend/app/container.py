"""Composition root : seul endroit qui instancie les adaptateurs d'infrastructure
et les relie aux cas d'utilisation (docs/02-solution-design.md §3).

Les cas d'utilisation sont créés à la demande : remplacer un adaptateur
(ex. `container.clock` dans un test) est pris en compte immédiatement.
"""

import secrets
from datetime import timedelta

from sqlalchemy import create_engine, inspect

from app.per.application.my_per import GetMyPayslips, GetMyPer, GetMyStatementPdf, ShowMyPayslip
from app.per.infrastructure.payslip_html import HtmlPayslipRenderer
from app.per.infrastructure.statement_pdf import PdfStatementRenderer
from app.per.infrastructure.sources import LocalPerSource, S3PerSource
from app.carrieres.application.deposit_piece import DepositPiece
from app.carrieres.application.my_pieces import GetMyPieceFile, ListMyPieces
from app.carrieres.infrastructure.sql_pieces import SqlCarrieresPieces
from app.carrieres.infrastructure.tables import CARRIERES_TABLES
from app.tools.create_fake_carrieres import create as create_fake_carrieres
from app.admin.application.audit_cases import RecordDossierConsultation
from app.admin.application.employee_documents import GetEmployeeDocumentFile, ListEmployeeDocuments
from app.admin.application.export_employees import ExportEmployeesList
from app.admin.application.get_audit_log import GetAuditLog
from app.admin.application.get_dashboard import GetMenuCounts, GetPilotDashboard
from app.admin.application.get_employee_folder import GetEmployeeFolder
from app.admin.application.lift_contact_hold import LiftContactHold
from app.admin.application.get_engagement import GetEngagement
from app.admin.application.get_statistics import GetStatistics
from app.admin.application.list_employees import ListEmployees
from app.admin.application.reset_access import UnlockAccess
from app.admin.application.search_qualified_employees import SearchQualifiedEmployees
from app.admin.application.notifications import GetNotifications, MarkAllNotificationsRead, MarkNotificationRead
from app.admin.infrastructure.sql_audit_repository import SqlAuditRepository
from app.admin.infrastructure.sql_notification_read_repository import SqlNotificationReadRepository
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
    ChangeAdminRole,
    CreateFirstAdmin,
    DeleteAdmin,
    GetCurrentAdmin,
    ImportConfiguredAdmin,
    ListAdmins,
    ListRoleChanges,
    LoginAdmin,
    SetAdminStatus,
)
from app.auth.application.employee_login import (
    ContactWatch,
    IdentifyEmployee,
    LoginGuard,
    LoginMessages,
    SendLoginCode,
    VerifyLoginCode,
)
from app.auth.application.use_cases import CountLogins
from app.auth.domain.model import SubjectType
from app.auth.domain.mfa import MfaMethod
from app.auth.domain.network import parse_networks
from app.auth.infrastructure.argon2_hasher import Argon2PasswordHasher
from app.auth.infrastructure.email import (
    LocalEmailSender,
    SesEmailSender,
    UnconfiguredEmailSender,
    load_alert_template,
    load_otp_template,
)
from app.auth.infrastructure.whatsapp import LocalWhatsAppSender, MetaWhatsAppSender, UnconfiguredWhatsAppSender
from app.auth.infrastructure.mfa_adapters import (
    ConfigurableCodeSender,
    LocalOutboxCodeSender,
    LoggingSecurityLog,
    PyOtpTotpService,
    UnconfiguredCodeSender,
)
from app.auth.infrastructure.sql_repositories import (
    SqlAccountRepository,
    SqlLoginCodeRepository,
    SqlCaptchaRepository,
    SqlLoginLockRepository,
    SqlSeenContactRepository,
    SqlWhatsAppQuotaRepository,
    SqlAdminAccountRepository,
    SqlLoginJournal,
    SqlSessionRepository,
)
from app.career.application.use_cases import GetCareerFields, GetMyCareer
from app.job.application.catalogue import GetJobProfile, ListJobProfiles
from app.job.application.notifications import GetMyNotifications
from app.job.application.use_cases import (
    ApplyToOpening,
    ChangeOpeningStatus,
    CloseApplication,
    CreateOpening,
    EmployeeEligibility,
    GetApplicationCv,
    GetOpening,
    GetOpeningForm,
    GetOpeningLetter,
    PublishOpening,
    ReceiveLetterUpload,
    RequestLetterUpload,
    ListMyApplications,
    ListMyOpenings,
    PreviewAudience,
    ListOpeningApplications,
    ListOpenings,
    MoveApplication,
    RequestCvUpload,
    UpdateOpening,
    WithdrawApplication,
)
from app.job.infrastructure.json_job_profile_catalogue import JsonJobProfileCatalogue
from app.job.infrastructure.sql_application_repository import SqlApplicationRepository
from app.job.infrastructure.sql_opening_repository import SqlOpeningRepository
from app.career.infrastructure.sql_career_repository import SqlCareerRepository
from app.certificate.application.use_cases import (
    CountFeedback,
    DeleteCertificate,
    GetMyCertificateFile,
    DepositCertificate,
    GetCertificateForm,
    GetEmployeeCertificatesForAdmin,
    GiveFeedback,
    Limits,
    ListMyCertificates,
    ReceiveLocalUpload,
    RequestUpload,
)
from app.certificate.application.validation_queue import (
    AssignCertificate,
    ClaimNextCertificate,
    CorrectCertificateFields,
    DecideCertificate,
    GetCertificateReview,
    GetValidationQueue,
)
from app.certificate.infrastructure.sql_certificate_repository import SqlCertificateRepository
from app.certificate.infrastructure.storage import LocalCertificateStorage, S3CertificateStorage
from app.config import Settings, normalize_database_url
from app.document.application.use_cases import UploadDocument
from app.document.infrastructure.local_file_storage import LocalFileStorage
from app.document.infrastructure.remote_file_storage import S3FileStorage
from app.document.infrastructure.sql_document_repository import SqlDocumentRepository
from app.dossier.application.error_reports_queue import DecideErrorReport, GetErrorReportsQueue, ListEmployeeReports
from app.dossier.application.use_cases import (
    ConfirmHrInformation,
    ConfirmStillAccurate,
    GetDossierSummary,
    GetFreshness,
    GetHrValues,
    GetMyDossier,
    GiveConsent,
    IsProfileComplete,
    ReportHrError,
    SaveContactAndEducation,
    SaveCoordinates,
)
from app.dossier.infrastructure.sql_dossier_repository import SqlDossierRepository
from app.employee.application.get_profile import GetEmployeeProfile
from app.employee.infrastructure.csv_employee_repository import CsvEmployeeRepository
from app.employee.infrastructure.vault_source import LocalVaultFile, S3VaultObject
from app.referential.application.use_cases import (
    GetReferential,
    ImportReferential,
    ListToAttach,
    ResolveAffectation,
    ResolveUnitCodes,
)
from app.referential.infrastructure.excel_reader import OpenpyxlReferentialReader
from app.referential.infrastructure.sql_referential_repository import SqlReferentialRepository
from app.shared.infrastructure.clock import SystemClock
from app.shared.infrastructure.database import Database
from app.update.application.use_cases import (
    RecordDecision,
    SaveDraft,
    SubmitUpdate,
)
from app.update.application.values import GetCurrentContact
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
        self.employees = CsvEmployeeRepository(vault_source(settings))
        self._carrieres = None
        self.per_source = None
        self.accounts = SqlAccountRepository(self.database)
        self.admin_accounts = SqlAdminAccountRepository(self.database)
        self.sessions = SqlSessionRepository(self.database)
        self.employee_logins = SqlLoginJournal(self.database)
        self.login_codes = SqlLoginCodeRepository(self.database)
        self.email_sender = email_sender(settings)
        self.whatsapp_sender = whatsapp_sender(settings)
        self.whatsapp_quotas = SqlWhatsAppQuotaRepository(self.database)
        self.seen_contacts = SqlSeenContactRepository(self.database)
        self.login_locks = SqlLoginLockRepository(self.database)
        self.captchas = SqlCaptchaRepository(self.database)
        self.otp_key = otp_key(settings)
        self.updates = SqlUpdateRepository(self.database)
        self.documents = SqlDocumentRepository(self.database)
        self.careers = SqlCareerRepository(self.database)
        self.referential = SqlReferentialRepository(self.database)
        self.dossiers = SqlDossierRepository(self.database)
        self.certificates = SqlCertificateRepository(self.database)
        self.audit_logs = SqlAuditRepository(self.database)
        self.notification_reads = SqlNotificationReadRepository(self.database)
        self.openings = SqlOpeningRepository(self.database)
        self.applications = SqlApplicationRepository(self.database)
        self.job_profiles = JsonJobProfileCatalogue(settings.job_profiles_path)
        self.certificate_storage = _certificate_storage(settings)
        self.letter_storage = _certificate_storage(settings, upload_url="/api/admin/openings/letter-uploads")
        self.file_storage = _file_storage(settings)
        self.password_hasher = Argon2PasswordHasher()
        self.totp = PyOtpTotpService()
        self.code_sender = ConfigurableCodeSender(
            meta_token=settings.whatsapp_meta_token,
            meta_phone_number_id=settings.whatsapp_meta_phone_number_id,
            twilio_account_sid=settings.whatsapp_twilio_account_sid,
            twilio_auth_token=settings.whatsapp_twilio_auth_token,
            twilio_from=settings.whatsapp_twilio_from,
            allow_demo_fallback=settings.shows_local_codes,
        )
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
            SubjectType.EMPLOYEE_LOGIN: timedelta(minutes=20),  # US-1016 : le défi du modèle dure 20 minutes
        }
        # US-1017 : la session employé est bornée à 15 minutes, même si la personne clique (modèle du directeur).
        fixed = frozenset({SubjectType.EMPLOYEE, SubjectType.EMPLOYEE_LOGIN})
        return SessionService(self.sessions, self.clock, durations, fixed)

    def identify_employee(self) -> IdentifyEmployee:
        return IdentifyEmployee(
            self.employees,
            LoginGuard(self.login_locks, self.captchas, self.login_messages()),
            self.session_service(),
            self.clock,
            self.login_messages(),
            self.whatsapp_quotas,
            self.contact_watch(),
            self.whatsapp_sender,
        )

    def login_messages(self) -> LoginMessages:
        return LoginMessages(self.email_sender, load_otp_template(), load_alert_template())

    def contact_watch(self) -> ContactWatch:
        return ContactWatch(self.seen_contacts, self.login_messages())

    def send_login_code(self) -> SendLoginCode:
        return SendLoginCode(
            self.employees,
            self.login_codes,
            self.email_sender,
            self.clock,
            self.otp_key,
            show_code=self.settings.app_env == "local",
            whatsapp=self.whatsapp_sender,
            quotas=self.whatsapp_quotas,
            watch=self.contact_watch(),
            messages=self.login_messages(),
        )

    def verify_login_code(self) -> VerifyLoginCode:
        return VerifyLoginCode(
            self.employees,
            self.login_codes,
            self.session_service(),
            self.clock,
            self.employee_logins,
            self.login_messages(),
            self.otp_key,
        )

    def login_admin(self) -> LoginAdmin:
        return LoginAdmin(
            self.admin_accounts,
            self.password_hasher,
            self.session_service(),
            self.clock,
            self.mfa_codes(),
            mfa_required=self.settings.admin_mfa_required,
        )

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

    def change_admin_role(self) -> ChangeAdminRole:
        return ChangeAdminRole(self.admin_accounts, self.clock)

    def set_admin_status(self) -> SetAdminStatus:
        return SetAdminStatus(self.admin_accounts, self.session_service(), self.clock)

    def list_role_changes(self) -> ListRoleChanges:
        return ListRoleChanges(self.admin_accounts)

    # --- employee / update ----------------------------------------------------

    def get_employee_profile(self) -> GetEmployeeProfile:
        return GetEmployeeProfile(
            self.employees, self.updates, ResolveAffectation(self.referential), GetDossierSummary(self.dossiers)
        )

    def record_decision(self) -> RecordDecision:
        return RecordDecision(self.updates, self.clock)

    def save_draft(self) -> SaveDraft:
        return SaveDraft(self.employees, self.updates, self.clock)

    def submit_update(self) -> SubmitUpdate:
        return SubmitUpdate(self.updates, self.clock)



    # --- admin ----------------------------------------------------------------

    def get_engagement(self) -> GetEngagement:
        return GetEngagement(
            CountLogins(self.employee_logins), CountFeedback(self.certificates), self.employees, self.clock
        )

    def get_statistics(self) -> GetStatistics:
        return GetStatistics(self.employees, self.updates)

    def get_pilot_dashboard(self) -> GetPilotDashboard:
        return GetPilotDashboard(
            self.employees, self.dossiers, self.certificates, self.referential, self.clock, self.openings, self.applications
        )

    def get_notifications(self) -> GetNotifications:
        return GetNotifications(
            self.certificates, self.dossiers, self.openings, self.applications, self.employees, self.notification_reads,
            self.clock,
        )

    def mark_notification_read(self) -> MarkNotificationRead:
        return MarkNotificationRead(self.notification_reads, self.clock)

    def mark_all_notifications_read(self) -> MarkAllNotificationsRead:
        return MarkAllNotificationsRead(self.notification_reads, self.clock)

    def get_my_notifications(self) -> GetMyNotifications:
        """US-120 : notifications de l'employé ; ses lectures passent par MarkNotificationRead sous « employee:<id> »."""
        return GetMyNotifications(
            self.openings, self.employee_eligibility(), self.referential, self.certificates, self.notification_reads,
            self.clock,
        )

    def get_menu_counts(self) -> GetMenuCounts:
        return GetMenuCounts(self.certificates, self.dossiers, self.referential)

    def get_employee_folder(self) -> GetEmployeeFolder:
        return GetEmployeeFolder(
            self.employees, self.updates, self.login_locks, self.employee_logins, self.clock, self.seen_contacts
        )

    def lift_contact_hold(self) -> LiftContactHold:
        return LiftContactHold(self.employees, self.seen_contacts, self.login_messages(), self.audit_logs, self.clock)

    def list_employees(self) -> ListEmployees:
        return ListEmployees(self.employees, self.updates)

    def search_qualified_employees(self) -> SearchQualifiedEmployees:
        return SearchQualifiedEmployees(self.employees, self.dossiers, self.certificates, self.referential)

    def record_dossier_consultation(self) -> RecordDossierConsultation:
        return RecordDossierConsultation(self.audit_logs, self.employees, self.clock)

    def export_employees_list(self) -> ExportEmployeesList:
        return ExportEmployeesList(self.search_qualified_employees(), self.audit_logs, self.clock)

    def get_audit_log(self) -> GetAuditLog:
        return GetAuditLog(self.audit_logs)

    def unlock_access(self) -> UnlockAccess:
        return UnlockAccess(self.employees, self.login_locks, self.session_service(), self.audit_logs, self.clock)

    def list_employee_documents(self) -> ListEmployeeDocuments:
        return ListEmployeeDocuments(self.employees, self.documents)

    def get_employee_document_file(self) -> GetEmployeeDocumentFile:
        return GetEmployeeDocumentFile(self.employees, self.documents, self.file_storage)

    # --- dossier de l'employé (US-202, US-203) ------------------------------------------------

    def current_contact(self) -> GetCurrentContact:
        return GetCurrentContact(self.employees, self.updates)

    def hr_values(self) -> GetHrValues:
        return GetHrValues(self.employees, ResolveAffectation(self.referential))

    def get_my_dossier(self) -> GetMyDossier:
        return GetMyDossier(self.dossiers, self.current_contact(), self.hr_values(), self.clock)

    def confirm_hr_information(self) -> ConfirmHrInformation:
        return ConfirmHrInformation(self.dossiers, self.hr_values(), self.clock)

    def get_freshness(self) -> GetFreshness:
        return GetFreshness(self.dossiers, self.hr_values(), self.clock)

    def confirm_still_accurate(self) -> ConfirmStillAccurate:
        return ConfirmStillAccurate(self.dossiers, self.hr_values(), self.clock)

    def report_hr_error(self) -> ReportHrError:
        return ReportHrError(self.dossiers, self.hr_values(), self.clock)

    def give_consent(self) -> GiveConsent:
        return GiveConsent(self.dossiers, self.clock)

    def save_coordinates(self) -> SaveCoordinates:
        return SaveCoordinates(self.dossiers, self.current_contact(), self.clock)

    def save_contact_and_education(self) -> SaveContactAndEducation:
        return SaveContactAndEducation(self.dossiers, self.current_contact(), self.clock)

    # --- certificats (US-301, US-303) ----------------------------------------------------

    def certificate_limits(self) -> Limits:
        return Limits(self.settings.max_upload_mb * 1024 * 1024, self.settings.max_certificates_per_employee)

    def get_certificate_form(self) -> GetCertificateForm:
        return GetCertificateForm(self.certificate_limits())

    def list_my_certificates(self) -> ListMyCertificates:
        return ListMyCertificates(self.certificates, self.certificate_limits())

    def request_upload(self) -> RequestUpload:
        return RequestUpload(
            self.certificates, IsProfileComplete(self.dossiers), self.certificate_storage, self.certificate_limits()
        )

    def receive_local_upload(self) -> ReceiveLocalUpload:
        return ReceiveLocalUpload(self.certificate_storage, self.certificate_limits())

    @property
    def carrieres(self) -> SqlCarrieresPieces:
        """US-1007 : ouverte au premier usage, pour qu'une base Carrières absente ne bloque pas le reste de PAM."""
        if self._carrieres is None:
            self._carrieres = SqlCarrieresPieces(carrieres_engine(self.settings))
        return self._carrieres

    @carrieres.setter
    def carrieres(self, value) -> None:
        self._carrieres = value

    def get_my_per(self) -> GetMyPer:
        if self.per_source is None:  # ouvert au premier usage, comme la base Carrières
            self.per_source = per_source(self.settings)
        return GetMyPer(self.employees, self.per_source, self.settings.per_s3_prefix)

    def get_my_payslips(self) -> GetMyPayslips:
        if self.per_source is None:
            self.per_source = per_source(self.settings)
        return GetMyPayslips(self.employees, self.per_source, self.settings.per_s3_prefix)

    def get_my_statement_pdf(self) -> GetMyStatementPdf:
        return GetMyStatementPdf(self.get_my_per(), self.employees, PdfStatementRenderer.with_acme_logo())

    def show_my_payslip(self) -> ShowMyPayslip:
        if self.per_source is None:
            self.per_source = per_source(self.settings)
        return ShowMyPayslip(self.employees, self.per_source, self.settings.per_s3_prefix, HtmlPayslipRenderer.load())

    def deposit_piece(self) -> DepositPiece:
        return DepositPiece(self.employees, self.carrieres, self.clock, IsProfileComplete(self.dossiers))

    def list_my_pieces(self) -> ListMyPieces:
        return ListMyPieces(self.employees, self.carrieres)

    def get_my_piece_file(self) -> GetMyPieceFile:
        return GetMyPieceFile(self.employees, self.carrieres)

    def deposit_certificate(self) -> DepositCertificate:
        return DepositCertificate(
            self.certificates,
            IsProfileComplete(self.dossiers),
            self.certificate_storage,
            self.clock,
            self.certificate_limits(),
        )

    def delete_certificate(self) -> DeleteCertificate:
        return DeleteCertificate(self.certificates, self.certificate_storage)

    def get_my_certificate_file(self) -> GetMyCertificateFile:
        return GetMyCertificateFile(self.certificates, self.certificate_storage)

    def get_employee_certificates_for_admin(self) -> GetEmployeeCertificatesForAdmin:
        return GetEmployeeCertificatesForAdmin(self.certificates)

    def give_feedback(self) -> GiveFeedback:
        return GiveFeedback(self.certificates, self.clock)

    # --- file de validation des certificats (US-401, US-402) -----------------------

    def get_validation_queue(self) -> GetValidationQueue:
        return GetValidationQueue(self.certificates, self.employees, self.referential, self.clock)

    def claim_next_certificate(self) -> ClaimNextCertificate:
        return ClaimNextCertificate(self.certificates, self.clock)

    def assign_certificate(self) -> AssignCertificate:
        return AssignCertificate(self.certificates, self.clock)

    def get_certificate_review(self) -> GetCertificateReview:
        return GetCertificateReview(self.certificates, self.employees, self.referential, self.clock)

    def correct_certificate_fields(self) -> CorrectCertificateFields:
        return CorrectCertificateFields(self.certificates, self.clock)

    def decide_certificate(self) -> DecideCertificate:
        return DecideCertificate(self.certificates, self.clock)

    # --- signalements d'erreur (US-403) ---------------------------------------------

    def get_error_reports_queue(self) -> GetErrorReportsQueue:
        return GetErrorReportsQueue(self.dossiers, self.employees, self.referential)

    def list_employee_reports(self) -> ListEmployeeReports:
        return ListEmployeeReports(self.dossiers)

    def decide_error_report(self) -> DecideErrorReport:
        return DecideErrorReport(self.dossiers, self.clock)

    # --- référentiel (US-501) -------------------------------------------------------

    def import_referential(self) -> ImportReferential:
        return ImportReferential(OpenpyxlReferentialReader(), self.referential, self.clock)

    def list_to_attach(self) -> ListToAttach:
        return ListToAttach(self.referential, self.employees)

    def get_referential(self) -> GetReferential:
        return GetReferential(self.referential)

    # --- job : postes ouverts (US-802) ---------------------------------------

    def get_opening_form(self) -> GetOpeningForm:
        return GetOpeningForm(self.referential)

    def _opening_ports(self):
        return self.openings, self.referential, self.audit_logs, self.clock, self.job_profiles

    def list_openings(self) -> ListOpenings:
        return ListOpenings(*self._opening_ports(), applications=self.applications)

    def get_opening(self) -> GetOpening:
        return GetOpening(*self._opening_ports())

    def create_opening(self) -> CreateOpening:
        return CreateOpening(*self._opening_ports())

    def update_opening(self) -> UpdateOpening:
        return UpdateOpening(*self._opening_ports())

    def change_opening_status(self) -> ChangeOpeningStatus:
        return ChangeOpeningStatus(*self._opening_ports())

    # --- job : lettre du directeur RH (US-124) ----------------------------------

    def request_letter_upload(self) -> RequestLetterUpload:
        return RequestLetterUpload(self.letter_storage, self.certificate_limits())

    def receive_letter_upload(self) -> ReceiveLetterUpload:
        return ReceiveLetterUpload(self.letter_storage, self.certificate_limits())

    def publish_opening(self) -> PublishOpening:
        return PublishOpening(*self._opening_ports(), storage=self.letter_storage, limits=self.certificate_limits())

    def get_opening_letter(self) -> GetOpeningLetter:
        return GetOpeningLetter(*self._opening_ports(), storage=self.letter_storage)

    # --- job : catalogue des postes ACME (US-119) -------------------------------

    def list_job_profiles(self) -> ListJobProfiles:
        return ListJobProfiles(self.job_profiles)

    def get_job_profile(self) -> GetJobProfile:
        return GetJobProfile(self.job_profiles)

    def employee_eligibility(self) -> EmployeeEligibility:
        return EmployeeEligibility(self.employees, self.certificates, ResolveUnitCodes(self.referential), self.clock)

    def list_my_openings(self) -> ListMyOpenings:
        return ListMyOpenings(self.openings, self.employee_eligibility(), self.referential, self.clock, self.job_profiles)

    def preview_audience(self) -> PreviewAudience:
        return PreviewAudience(self.employee_eligibility(), self.referential, self.clock)

    # --- job : candidatures (US-902) -----------------------------------------

    def _application_ports(self):
        return self.applications, self.openings, self.employees, self.audit_logs, self.clock

    def apply_to_opening(self) -> ApplyToOpening:
        return ApplyToOpening(
            *self._application_ports(),
            eligibility=self.employee_eligibility(),
            profile_complete=IsProfileComplete(self.dossiers),
            storage=self.certificate_storage,
            limits=self.certificate_limits(),
            referential=self.referential,
        )

    def request_cv_upload(self) -> RequestCvUpload:
        return RequestCvUpload(self.certificate_storage, self.certificate_limits(), IsProfileComplete(self.dossiers))

    def get_application_cv(self) -> GetApplicationCv:
        return GetApplicationCv(*self._application_ports(), storage=self.certificate_storage)

    def list_my_applications(self) -> ListMyApplications:
        return ListMyApplications(*self._application_ports())

    def withdraw_application(self) -> WithdrawApplication:
        return WithdrawApplication(*self._application_ports())

    def list_opening_applications(self) -> ListOpeningApplications:
        return ListOpeningApplications(*self._application_ports())

    def move_application(self) -> MoveApplication:
        return MoveApplication(*self._application_ports())

    def close_application(self) -> CloseApplication:
        return CloseApplication(*self._application_ports())

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





def email_sender(settings: Settings):
    """US-1003 : SES dès qu'un expéditeur est configuré ; sinon rien ne part, et seul le poste local affiche le code."""
    if settings.ses_sender:
        return SesEmailSender.create(settings.ses_sender, settings.ses_region, settings.ses_reply_to)
    if settings.app_env == "local":
        return LocalEmailSender()
    return UnconfiguredEmailSender()


def whatsapp_sender(settings: Settings):
    """US-1004 : API de Meta dès que le jeton, le numéro et le modèle sont configurés ; sinon, seul le poste local
    affiche le code, et ailleurs WhatsApp est refusé."""
    if settings.whatsapp_meta_token and settings.whatsapp_meta_phone_number_id and settings.whatsapp_template:
        return MetaWhatsAppSender(
            settings.whatsapp_meta_token, settings.whatsapp_meta_phone_number_id, settings.whatsapp_template
        )
    if settings.app_env == "local":
        return LocalWhatsAppSender()
    return UnconfiguredWhatsAppSender()


def otp_key(settings: Settings) -> str:
    """US-1003 : clé des empreintes des codes. Obligatoire en production ; ailleurs, une clé de développement
    (poste local) ou tirée au démarrage (les codes en cours ne survivent pas à un redémarrage)."""
    if settings.otp_hmac_key:
        return settings.otp_hmac_key
    if settings.app_env == "production":
        raise ValueError("OTP_HMAC_KEY est obligatoire en production (clé des codes de connexion).")
    if settings.app_env == "local":
        return "cle-de-developpement-du-poste-local"
    return secrets.token_hex(32)


def per_source(settings: Settings):
    """US-1012 : le seau des balances dès qu'il est configuré, sauf en `demo` et `recette` (balances fictives) ;
    en production, jamais un fichier posé sur le disque."""
    if settings.per_s3_bucket and settings.app_env not in ("demo", "recette"):
        return S3PerSource.create(settings.per_s3_bucket, settings.s3_region)
    if settings.app_env == "production":
        raise ValueError("PER_S3_BUCKET est obligatoire en production : les balances viennent de l'export Shivam.")
    return LocalPerSource(settings.per_local_dir)


def carrieres_engine(settings: Settings):
    """US-1007 : la base de Carrières. En production, `CARRIERES_DATABASE_URL` est obligatoire ; ailleurs, sans
    adresse, une base fictive est créée dans ACME_DATA_DIR (US-1000), jamais à côté d'une vraie base."""
    if settings.carrieres_database_url:
        return create_engine(normalize_database_url(settings.carrieres_database_url), pool_pre_ping=True)
    if settings.app_env == "production":
        raise ValueError("CARRIERES_DATABASE_URL est obligatoire en production : PAM écrit les pièces dans Carrières.")
    engine = create_engine(f"sqlite:///{(settings.acme_data_dir / 'carrieres.db').as_posix()}")
    if not set(CARRIERES_TABLES) & set(inspect(engine).get_table_names()):
        create_fake_carrieres(engine, app_env=settings.app_env)
    return engine


def vault_source(settings: Settings):
    """US-1001 : la copie Vault sur S3 dès qu'un seau est configuré, sauf en `demo` et `recette` où le jeu
    fictif reste imposé (US-001 CA-05) ; en production, jamais un fichier posé sur le disque."""
    if settings.vault_s3_bucket and settings.app_env not in ("demo", "recette"):
        return S3VaultObject.create(settings.vault_s3_bucket, settings.vault_s3_key, settings.s3_region)
    if settings.app_env == "production":
        raise ValueError(
            "VAULT_S3_BUCKET est obligatoire en production : la liste des employés vient de la copie Vault sur S3."
        )
    return LocalVaultFile(settings.acme_csv_path)


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


def _certificate_storage(settings: Settings, upload_url: str = "/api/me/certificates/uploads"):
    """US-301 CA-06 : en ligne, dépôt signé direct dans le compartiment privé ; en local, sur le disque.
    US-124 : les lettres du directeur RH vont au même stockage ; en local, elles arrivent par `upload_url`."""
    if settings.storage_backend == "s3":
        return S3CertificateStorage.create(
            settings.s3_bucket,
            settings.s3_region,
            settings.s3_endpoint_url,
            settings.s3_access_key_id,
            settings.s3_secret_access_key,
        )
    return LocalCertificateStorage(settings.certificates_dir, upload_url)
