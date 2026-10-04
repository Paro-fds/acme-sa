from typing import Protocol

from app.employee.domain.employee import Employee
from app.shared.domain.errors import NotFound


class EmployeeNotFound(NotFound):
    code = "EMPLOYEE_NOT_FOUND"
    message = "Employé introuvable."


class EmployeeRepository(Protocol):
    """Accès aux employés actifs de la source de référence (CSV en V1, base ACME en V2)."""

    def get(self, employee_id: str) -> Employee | None: ...

    def list_all(self) -> list[Employee]: ...


def get_employee(employees: EmployeeRepository, employee_id: str) -> Employee:
    employee = employees.get(employee_id)
    if employee is None:
        raise EmployeeNotFound()
    return employee
