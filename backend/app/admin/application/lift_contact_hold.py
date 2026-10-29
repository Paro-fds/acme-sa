from app.admin.domain.audit import AuditAction, AuditEntry, AuditRepository
from app.admin.domain.errors import NoContactHold
from app.auth.application.employee_login import LoginMessages
from app.auth.domain.errors import InvalidMfaDestination
from app.auth.domain.login_code import LoginChannel
from app.auth.domain.mfa import MfaMethod, normalize_destination
from app.auth.domain.ports import SeenContactRepository
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock

LIFTED = "Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier."
LIFTED_WITHOUT_EMAIL = "Gel levé. Ce dossier n'a toujours pas d'adresse de courriel utilisable."


def _usable_email(value: str | None) -> str | None:
    try:
        return normalize_destination(MfaMethod.EMAIL, value)
    except InvalidMfaDestination:
        return None


class LiftContactHold:
    """US-1026 (D-64) : la main levée du directeur (`main_levee`), depuis le dossier de l'employé côté RH.

    Lève le gel de 72 heures du courriel et du numéro (US-1005) sans toucher aux contacts du dossier, prévient
    l'employé par l'avis du directeur et trace l'action au journal d'audit. Rend le message à afficher.
    """

    def __init__(
        self,
        employees: EmployeeRepository,
        contacts: SeenContactRepository,
        messages: LoginMessages,
        audit_logs: AuditRepository,
        clock: Clock,
    ) -> None:
        self._employees = employees
        self._contacts = contacts
        self._messages = messages
        self._audit_logs = audit_logs
        self._clock = clock

    def execute(self, employee_id: str, actor_id: str) -> str:
        employee = get_employee(self._employees, employee_id)  # seul un employé actif de Vault
        now = self._clock.now()
        email = _usable_email(employee.email_address)
        held = [
            seen
            for channel in (LoginChannel.EMAIL, LoginChannel.WHATSAPP)
            if (seen := self._contacts.get(employee.id, channel)) is not None and seen.is_held(now)
        ]
        if not held:
            raise NoContactHold(without_email=email is None)
        for seen in held:
            seen.lift()
            self._contacts.save(seen)
        self._audit_logs.add(
            AuditEntry(
                id=None,
                at=now,
                actor_id=actor_id,
                actor_name=actor_id,
                action=AuditAction.ACCOUNT_MANAGEMENT.value,
                target_id=employee.employee_code,
                target_name=f"{employee.first_name} {employee.last_name}",
                details="Gel de 72 heures levé",
            )
        )
        if email is None:
            return LIFTED_WITHOUT_EMAIL
        self._messages.hold_lifted(email, employee.first_name, now)
        return LIFTED
