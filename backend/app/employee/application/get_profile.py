from dataclasses import dataclass
from datetime import date

from app.employee.domain.repository import EmployeeRepository, get_employee
from app.update.application.use_cases import UpdateView, update_view
from app.update.application.values import current_values
from app.update.domain.editable_fields import EDITABLE_FIELDS
from app.update.domain.repository import UpdateRepository


@dataclass(frozen=True)
class ProfileView:
    employee_code: str
    last_name: str
    first_name: str
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
    editable_fields: list[str]
    update: UpdateView


class GetEmployeeProfile:
    """US-05 : profil de l'employé connecté (valeurs soumises affichées, D-05)."""

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository) -> None:
        self._employees = employees
        self._updates = updates

    def execute(self, employee_id: str) -> ProfileView:
        employee = get_employee(self._employees, employee_id)
        update = self._updates.get_for_employee(employee_id)
        values = current_values(employee, update)
        return ProfileView(
            employee_code=employee.employee_code,
            last_name=values["last_name"],
            first_name=values["first_name"],
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
            editable_fields=list(EDITABLE_FIELDS),
            update=update_view(update),
        )
