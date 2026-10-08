from app.auth.application.identity import Identity, find_employee
from app.auth.application.sessions import SessionService
from app.auth.domain.errors import AccountLocked, IdentityNotRecognized, LoginFailed, RegistrationRefused
from app.auth.domain.model import Account, SubjectType
from app.auth.domain.password import validate_new_password
from app.auth.domain.ports import AccountRepository, PasswordHasher
from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.clock import Clock
from app.update.domain.repository import UpdateRepository


class RegisterPassword:
    """US-02, US-101 : crée le mot de passe à la première connexion et ouvre une session.

    Les règles du mot de passe sont vérifiées avant l'identité, et une personne inconnue reçoit
    la même réponse qu'un employé qui a déjà un mot de passe : on ne peut pas deviner qui est employé."""

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
        validate_new_password(password, confirmation)
        try:
            employee = find_employee(self._employees, self._updates, identity)
        except IdentityNotRecognized:
            raise RegistrationRefused() from None
        account = self._accounts.get(employee.id) or Account(employee_id=employee.id, password_hash=None)
        if account.has_password:
            raise RegistrationRefused()

        account.password_hash = self._hasher.hash(password)
        account.failed_attempts = 0
        account.locked_until = None
        self._accounts.save(account)
        return self._sessions.open(SubjectType.EMPLOYEE, employee.id)


class LoginEmployee:
    """US-03, US-101 : connexion en une étape (identité et mot de passe), blocage 15 minutes après
    5 erreurs consécutives. Un seul message d'échec, quelle qu'en soit la cause (CA-03)."""

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
        try:
            employee = find_employee(self._employees, self._updates, identity)
        except IdentityNotRecognized:
            raise LoginFailed() from None
        account = self._accounts.get(employee.id)
        if account is None or not account.has_password:
            raise LoginFailed()

        now = self._clock.now()
        if account.is_locked(now):
            raise AccountLocked(account.seconds_until_unlock(now))

        if not self._hasher.verify(account.password_hash, password):
            account.register_failure(now)
            self._accounts.save(account)
            if account.is_locked(now):
                raise AccountLocked(account.seconds_until_unlock(now))
            raise LoginFailed()

        account.register_success()
        self._accounts.save(account)
        return self._sessions.open(SubjectType.EMPLOYEE, employee.id)
