from app.admin.domain.statistics import CampaignStatistics
from app.employee.domain.repository import EmployeeRepository
from app.update.domain.repository import UpdateRepository
from app.update.domain.update import AdminStatus, admin_status


class GetStatistics:
    """US-16 : statistiques calculées sur les employés actifs du CSV ; le brouillon compte comme « non effectuée »."""

    def __init__(self, employees: EmployeeRepository, updates: UpdateRepository) -> None:
        self._employees = employees
        self._updates = updates

    def execute(self) -> CampaignStatistics:
        updates = {update.employee_id: update for update in self._updates.list_all()}
        employees = self._employees.list_all()
        updated = sum(1 for employee in employees if admin_status(updates.get(employee.id)) == AdminStatus.UPDATED)
        return CampaignStatistics.compute(total=len(employees), updated=updated)
