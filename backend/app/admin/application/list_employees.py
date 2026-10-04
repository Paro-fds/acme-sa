from dataclasses import dataclass

from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.text import normalize
from app.update.application.values import current_values
from app.update.domain.repository import UpdateRepository
from app.update.domain.update import AdminStatus, admin_status


@dataclass(frozen=True)
class EmployeeListItem:
    id: str
    employee_code: str
    last_name: str
    first_name: str
    agency_code: str
    position: str
    status: AdminStatus


@dataclass(frozen=True)
class EmployeePage:
    items: list[EmployeeListItem]
    total: int
    page: int
    page_size: int


class ListEmployees:
    """US-17 : liste des employés actifs avec leur statut, triée par nom puis prénom."""

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository) -> None:
        self._employees = employees
        self._updates = updates

    def execute(self, page: int = 1, page_size: int = 20) -> EmployeePage:
        updates = {update.employee_id: update for update in self._updates.list_all()}
        items = []
        for employee in self._employees.list_all():
            update = updates.get(employee.id)
            values = current_values(employee, update)
            items.append(
                EmployeeListItem(
                    id=employee.id,
                    employee_code=employee.employee_code,
                    last_name=values["last_name"],
                    first_name=values["first_name"],
                    agency_code=employee.agency_code,
                    position=employee.position,
                    status=admin_status(update),
                )
            )
        items.sort(key=lambda item: (normalize(item.last_name), normalize(item.first_name), item.id))

        start = (page - 1) * page_size
        return EmployeePage(items=items[start : start + page_size], total=len(items), page=page, page_size=page_size)
