from dataclasses import dataclass
from datetime import date, datetime

from app.admin.application.list_employees import previous_name
from app.auth.domain.logins import LoginJournal
from app.auth.domain.login_lock import code_key, typed_code
from app.auth.domain.login_code import LoginChannel
from app.auth.domain.ports import LoginLockRepository, SeenContactRepository
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock
from app.update.application.use_cases import ChangeView, change_views
from app.update.application.values import current_values, reference_values
from app.update.domain.repository import UpdateRepository
from app.update.domain.update import AdminStatus, admin_status


@dataclass(frozen=True)
class EmployeeFolder:
    """Dossier vu par l'administration : valeurs actuelles, mise à jour soumise, état du compte."""

    id: str
    employee_code: str
    last_name: str
    first_name: str
    display_name: str
    previous_name: str | None
    gender: str
    birth_date: date
    telephone_number: str
    email_address: str
    address_line_1: str
    agency_code: str
    department: str
    position: str
    grade: str
    level: str
    contract_nature: str
    hire_date: date | None
    status: AdminStatus
    submitted_at: datetime | None
    declined: bool
    """L'employé a répondu « Non » (et n'a pas soumis depuis)."""
    changes: list[ChangeView]
    """Changements soumis uniquement : un brouillon n'est jamais visible (Solution Design §6.1)."""
    account_activated: bool
    """US-1003 : l'employé s'est déjà connecté au moins une fois."""
    access_locked: bool
    """US-1003 : accès verrouillé après des échecs (« Débloquer l'accès »)."""
    contact_hold: bool = False
    """US-1026 : gel de 72 heures en cours après un changement de contact (« Lever le gel »)."""


class GetEmployeeFolder:
    """US-20 : dossier d'un employé actif, en lecture seule ; 404 pour un inactif ou un inconnu."""

    def __init__(
        self,
        employees: EmployeeRepository,
        updates: UpdateRepository,
        locks: LoginLockRepository,
        logins: LoginJournal,
        clock: Clock,
        contacts: SeenContactRepository | None = None,
    ) -> None:
        self._employees = employees
        self._updates = updates
        self._locks = locks
        self._logins = logins
        self._clock = clock
        self._contacts = contacts

    def execute(self, employee_id: str) -> EmployeeFolder:
        employee = get_employee(self._employees, employee_id)
        update = self._updates.get_for_employee(employee.id)
        submitted = update is not None and update.has_submission
        values = current_values(employee, update)
        lock = self._locks.get(code_key(typed_code(employee.employee_code)))
        return EmployeeFolder(
            id=employee.id,
            employee_code=employee.employee_code,
            last_name=values["last_name"],
            first_name=values["first_name"],
            display_name=f"{values['last_name']} {values['first_name']}",
            previous_name=previous_name(reference_values(employee), values),
            gender=employee.gender,
            birth_date=employee.birth_date,
            telephone_number=values["telephone_number"],
            email_address=values["email_address"],
            address_line_1=values["address_line_1"],
            agency_code=employee.agency_code,
            department=employee.department,
            position=employee.position,
            grade=employee.grade,
            level=employee.level,
            contract_nature=employee.contract_nature,
            hire_date=employee.hire_date,
            status=admin_status(update),
            submitted_at=update.submitted_at if submitted else None,
            declined=update is not None and not submitted and not update.accepted,
            changes=change_views(update.submitted_changes) if submitted else [],
            account_activated=self._logins.has_logged_in(employee.id),
            access_locked=lock is not None and lock.is_locked(self._clock.now()),
            contact_hold=self._held(employee.id),
        )

    def _held(self, employee_id: str) -> bool:
        if self._contacts is None:
            return False
        now = self._clock.now()
        return any(
            (seen := self._contacts.get(employee_id, channel)) is not None and seen.is_held(now)
            for channel in (LoginChannel.EMAIL, LoginChannel.WHATSAPP)
        )
