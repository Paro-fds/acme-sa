from typing import Protocol

from app.update.domain.update import EmployeeUpdate


class UpdateRepository(Protocol):
    def get_for_employee(self, employee_id: str) -> EmployeeUpdate | None: ...

    def save(self, update: EmployeeUpdate) -> None: ...

    def list_all(self) -> list[EmployeeUpdate]: ...
