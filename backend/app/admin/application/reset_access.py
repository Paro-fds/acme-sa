from app.admin.domain.audit import AuditAction, AuditEntry, AuditRepository
from app.auth.application.sessions import SessionService
from app.auth.domain.model import SubjectType
from app.auth.domain.login_lock import code_key, typed_code
from app.auth.domain.ports import LoginLockRepository
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock


class UnlockAccess:
    """US-1003 (anciennement US-22 « Réinitialiser l'accès ») : débloquer l'accès d'un employé.

    Lève le verrouillage après des échecs et ferme les sessions de l'employé ; le dossier n'est pas touché.
    Il n'y a plus de mot de passe à effacer : l'employé se reconnecte avec un code reçu par courriel.
    Chaque action est tracée dans le journal d'audit (US-104 CA-03).
    """

    def __init__(
        self,
        employees: EmployeeRepository,
        locks: LoginLockRepository,
        sessions: SessionService,
        audit_logs: AuditRepository | None = None,
        clock: Clock | None = None,
    ) -> None:
        self._employees = employees
        self._locks = locks
        self._sessions = sessions
        self._audit_logs = audit_logs
        self._clock = clock

    def execute(self, employee_id: str, actor_id: str | None = None) -> None:
        # Seul un employé actif de Vault est accepté.
        employee = get_employee(self._employees, employee_id)
        lock = self._locks.get(code_key(typed_code(employee.employee_code)))
        if lock is not None:  # US-1015 : le compteur du code repart à zéro
            lock.reset()
            self._locks.save(lock)
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
                    details="Accès débloqué",
                )
            )
