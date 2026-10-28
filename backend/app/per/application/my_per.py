from app.employee.domain.repository import EmployeeRepository, get_employee
from app.per.domain.payslips import Payslip, payslip_key, payslips
from app.per.domain.payslip_sheet import payslip_sheet, sheet_filename
from app.per.domain.ports import PayslipRenderer, PerSource, PerSourceUnavailable
from app.per.domain.statement import NoBalance, PerSnapshot, PerUnavailable, per_key, statement


class GetMyPer:
    """US-1012 : la balance PER et le relevé de l'employé connecté. La clé est calculée depuis le code de la
    session ; aucun paramètre du navigateur n'entre dans la clé (modèle du directeur)."""

    def __init__(self, employees: EmployeeRepository, source: PerSource, prefix: str) -> None:
        self._employees = employees
        self._source = source
        self._prefix = prefix

    def execute(self, employee_id: str) -> tuple[PerSnapshot, ...]:
        employee = get_employee(self._employees, employee_id)
        try:
            document = self._source.read(per_key(employee.employee_code, self._prefix))
        except PerSourceUnavailable:
            raise PerUnavailable() from None
        photos = statement(document)
        if not photos:
            raise NoBalance()
        return photos


class GetMyPayslips:
    """US-1020 : mes bulletins de paie ; aucun bulletin n'est pas une erreur (l'écran le dit)."""

    def __init__(self, employees: EmployeeRepository, source: PerSource, prefix: str) -> None:
        self._employees = employees
        self._source = source
        self._prefix = prefix

    def execute(self, employee_id: str) -> tuple[Payslip, ...]:
        employee = get_employee(self._employees, employee_id)
        try:
            return payslips(self._source.read(payslip_key(employee.employee_code, self._prefix)))
        except PerSourceUnavailable:
            raise PerUnavailable() from None


class DownloadMyPayslip:
    """US-1021 : la fiche de paie d'un mois en PDF ; seule la période vient du navigateur."""

    def __init__(self, employees: EmployeeRepository, source: PerSource, prefix: str, renderer: PayslipRenderer) -> None:
        self._employees = employees
        self._source = source
        self._prefix = prefix
        self._renderer = renderer

    def execute(self, employee_id: str, period: str) -> tuple[bytes, str]:
        employee = get_employee(self._employees, employee_id)
        try:
            document = self._source.read(payslip_key(employee.employee_code, self._prefix))
        except PerSourceUnavailable:
            raise PerUnavailable() from None
        name = f"{employee.first_name} {employee.last_name}".strip()
        sheet = payslip_sheet(document, period, employee.employee_code, name)
        return self._renderer.render(sheet), sheet_filename(period)
