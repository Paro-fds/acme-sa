from app.employee.domain.employee import Employee
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.update.domain.editable_fields import EDITABLE_FIELDS
from app.update.domain.repository import UpdateRepository
from app.update.domain.update import EmployeeUpdate


def reference_values(employee: Employee) -> dict[str, str]:
    """Valeurs de la source de référence pour les champs modifiables."""
    return {code: getattr(employee, code) for code in EDITABLE_FIELDS}


def current_values(employee: Employee, update: EmployeeUpdate | None) -> dict[str, str]:
    """Valeurs à afficher : la référence, remplacée par les valeurs du **dernier envoi** (D-05, US-24).

    Un brouillon, y compris celui d'une nouvelle modification, n'est jamais considéré comme une valeur actuelle.
    """
    values = reference_values(employee)
    if update is not None and update.has_submission:
        values.update({code: change.new_value for code, change in update.submitted_changes.items()})
    return values


class GetCurrentContact:
    """US-202 : coordonnées actuelles (export, ou dernier envoi du MVP), proposées à l'employé tant qu'il ne les a
    pas confirmées dans son dossier."""

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository) -> None:
        self._employees = employees
        self._updates = updates

    def execute(self, employee_id: str) -> dict[str, str]:
        values = current_values(get_employee(self._employees, employee_id), self._updates.get_for_employee(employee_id))
        return {
            "telephone": values["telephone_number"],
            "address": values["address_line_1"],
            "email": values["email_address"],
        }
