from app.admin.domain.audit import AuditAction, AuditEntry, AuditRepository
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock


class RecordDossierConsultation:
    """US-602 CA-04 : Chaque consultation d'un dossier depuis la liste est tracée."""

    def __init__(self, audit_repo: AuditRepository, employees: EmployeeRepository, clock: Clock) -> None:
        self._audit_repo = audit_repo
        self._employees = employees
        self._clock = clock

    def execute(self, actor_id: str, employee_id: str) -> None:
        employee = get_employee(self._employees, employee_id)
        entry = AuditEntry(
            id=None,
            at=self._clock.now(),
            actor_id=actor_id,
            actor_name=actor_id,
            action=AuditAction.DOSSIER_VIEW.value,
            target_id=employee.employee_code,
            target_name=f"{employee.first_name} {employee.last_name}",
            details=f"Consultation du dossier de l'employé {employee.employee_code}",
        )
        self._audit_repo.add(entry)
