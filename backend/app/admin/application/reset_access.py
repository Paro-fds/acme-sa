from app.admin.domain.audit import AuditAction, AuditEntry, AuditRepository
from app.admin.domain.errors import AccountNotActivated
from app.auth.application.sessions import SessionService
from app.auth.domain.model import SubjectType
from app.auth.domain.ports import AccountRepository
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock


class ResetAccess:
    """US-22 & US-104 : réinitialisation de l'accès d'un employé.

    Efface le mot de passe, lève le blocage et ferme les sessions de l'employé ;
    le dossier (brouillon, mise à jour, changements, documents) n'est pas touché (CA-01).
    Chaque action est tracée dans le journal d'audit (CA-03).
    """

    def __init__(
        self,
        employees: EmployeeRepository,
        accounts: AccountRepository,
        sessions: SessionService,
        audit_logs: AuditRepository | None = None,
        clock: Clock | None = None,
    ) -> None:
        self._employees = employees
        self._accounts = accounts
        self._sessions = sessions
        self._audit_logs = audit_logs
        self._clock = clock

    def execute(self, employee_id: str, actor_id: str | None = None) -> None:
        # Seul un employé actif du CSV est accepté : la ligne « admin » de la table des comptes reste hors d'atteinte.
        employee = get_employee(self._employees, employee_id)
        account = self._accounts.get(employee.id)
        if account is None or not account.has_password:
            raise AccountNotActivated()
        account.password_hash = None
        account.register_success()
        self._accounts.save(account)
        self._sessions.close_all_for(SubjectType.EMPLOYEE, employee.id)

        if self._audit_logs and self._clock and actor_id:
            self._audit_logs.add(
                AuditEntry(
                    id=None,
                    at=self._clock.now(),
                    actor_id=actor_id,
                    actor_name=actor_id,
                    action=AuditAction.ACCOUNT_MANAGEMENT.value,
                    target_id=employee.employee_code,
                    target_name=f"{employee.first_name} {employee.last_name}",
                    details="Accès réinitialisé",
                )
            )
