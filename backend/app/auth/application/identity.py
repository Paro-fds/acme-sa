from dataclasses import dataclass
from datetime import date

from app.auth.domain.errors import IdentityAmbiguous, IdentityNotRecognized
from app.employee.domain.employee import Employee
from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.text import normalize
from app.update.application.values import current_values
from app.update.domain.repository import UpdateRepository


@dataclass(frozen=True)
class Identity:
    last_name: str
    first_name: str
    birth_date: date


def _known_names(employee: Employee, updates: dict) -> set[tuple[str, str]]:
    """Noms sous lesquels l'employé peut s'identifier : ceux de la référence
    et, une fois soumis, ses nouveaux nom et prénom (D-03). Un brouillon ne compte pas."""
    names = {(normalize(employee.last_name), normalize(employee.first_name))}
    update = updates.get(employee.id)
    if update is not None and update.is_submitted:
        values = current_values(employee, update)
        names.add((normalize(values["last_name"]), normalize(values["first_name"])))
    return names


def find_employee(employees: EmployeeRepository, updates: UpdateRepository, identity: Identity) -> Employee:
    """Retrouve l'unique employé actif correspondant, sans jamais choisir arbitrairement."""
    wanted = (normalize(identity.last_name), normalize(identity.first_name))
    updates_by_employee = {update.employee_id: update for update in updates.list_all()}
    matches = [
        employee
        for employee in employees.list_all()
        if employee.birth_date == identity.birth_date and wanted in _known_names(employee, updates_by_employee)
    ]
    if not matches:
        raise IdentityNotRecognized()
    if len(matches) > 1:
        raise IdentityAmbiguous()
    return matches[0]
