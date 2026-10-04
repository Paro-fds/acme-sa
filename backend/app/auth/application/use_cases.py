from enum import StrEnum

from app.auth.application.identity import Identity, find_employee
from app.auth.application.sessions import SessionService
from app.auth.domain.errors import (
    AccountAlreadyExists,
    AccountLocked,
    InvalidAdminCredentials,
    PasswordNotSet,
    invalid_credentials,
)
from app.auth.domain.lockout import SHOW_REMAINING_FROM
from app.auth.domain.model import ADMIN_SUBJECT_ID, Account, SubjectType
from app.auth.domain.password import validate_new_password
from app.auth.domain.ports import AccountRepository, PasswordHasher
from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.clock import Clock
from app.update.domain.repository import UpdateRepository


class NextStep(StrEnum):
    CREATE_PASSWORD = "CREATE_PASSWORD"
    ENTER_PASSWORD = "ENTER_PASSWORD"


class IdentifyEmployee:
    """US-01 : vérifie l'identité et indique l'étape suivante, sans ouvrir de session."""

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository, accounts: AccountRepository) -> None:
        self._employees = employees
        self._updates = updates
        self._accounts = accounts

    def execute(self, identity: Identity) -> NextStep:
        employee = find_employee(self._employees, self._updates, identity)
        account = self._accounts.get(employee.id)
        return NextStep.ENTER_PASSWORD if account and account.has_password else NextStep.CREATE_PASSWORD


class RegisterPassword:
    """US-02 : crée le mot de passe à la première connexion et ouvre une session."""

    def __init__(
        self,
        employees: EmployeeRepository,
        updates: UpdateRepository,
        accounts: AccountRepository,
        hasher: PasswordHasher,
        sessions: SessionService,
    ) -> None:
        self._employees = employees
        self._updates = updates
        self._accounts = accounts
        self._hasher = hasher
        self._sessions = sessions

    def execute(self, identity: Identity, password: str, confirmation: str) -> str:
        employee = find_employee(self._employees, self._updates, identity)
        account = self._accounts.get(employee.id) or Account(employee_id=employee.id, password_hash=None)
        if account.has_password:
            raise AccountAlreadyExists()
        validate_new_password(password, confirmation)

        account.password_hash = self._hasher.hash(password)
        account.failed_attempts = 0
        account.locked_until = None
        self._accounts.save(account)
        return self._sessions.open(SubjectType.EMPLOYEE, employee.id)


class LoginEmployee:
    """US-03 : connexion avec le mot de passe, blocage 15 minutes après 5 erreurs consécutives."""

    def __init__(
        self,
        employees: EmployeeRepository,
        updates: UpdateRepository,
        accounts: AccountRepository,
        hasher: PasswordHasher,
        sessions: SessionService,
        clock: Clock,
    ) -> None:
        self._employees = employees
        self._updates = updates
        self._accounts = accounts
        self._hasher = hasher
        self._sessions = sessions
        self._clock = clock

    def execute(self, identity: Identity, password: str) -> str:
        employee = find_employee(self._employees, self._updates, identity)
        account = self._accounts.get(employee.id)
        if account is None or not account.has_password:
            raise PasswordNotSet()

        now = self._clock.now()
        if account.is_locked(now):
            raise AccountLocked()

        if not self._hasher.verify(account.password_hash, password):
            account.register_failure(now)
            self._accounts.save(account)
            if account.is_locked(now):
                raise AccountLocked()
            raise invalid_credentials(account.remaining_attempts, account.failed_attempts >= SHOW_REMAINING_FROM)

        account.register_success()
        self._accounts.save(account)
        return self._sessions.open(SubjectType.EMPLOYEE, employee.id)


class LoginAdmin:
    """US-15 : connexion du compte administrateur unique défini dans la configuration."""

    def __init__(self, username: str, password_hash: str, hasher: PasswordHasher, sessions: SessionService) -> None:
        self._username = username
        self._password_hash = password_hash
        self._hasher = hasher
        self._sessions = sessions

    def execute(self, username: str, password: str) -> str:
        valid = (
            bool(self._password_hash)
            and username == self._username
            and self._hasher.verify(self._password_hash, password)
        )
        if not valid:
            raise InvalidAdminCredentials()
        return self._sessions.open(SubjectType.ADMIN, ADMIN_SUBJECT_ID)
