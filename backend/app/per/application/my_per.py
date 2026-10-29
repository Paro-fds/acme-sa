from app.employee.domain.repository import EmployeeRepository, get_employee
from app.per.domain.payslips import Payslip, payslip_key, payslips
from app.per.domain.payslip_sheet import payslip_sheet
from app.per.domain.ports import PayslipRenderer, PerSource, PerSourceUnavailable, StatementRenderer
from app.per.domain.statement import NoBalance, PerSnapshot, PerUnavailable, per_key, statement
from app.per.domain.statement_period import StatementSheet, statement_between, statement_filename


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


class ShowMyPayslip:
    """US-1022 : la fiche de paie d'un mois, au format du directeur ; seule la période vient du navigateur."""

    def __init__(self, employees: EmployeeRepository, source: PerSource, prefix: str, renderer: PayslipRenderer) -> None:
        self._employees = employees
        self._source = source
        self._prefix = prefix
        self._renderer = renderer

    def execute(self, employee_id: str, period: str) -> str:
        employee = get_employee(self._employees, employee_id)
        try:
            document = self._source.read(payslip_key(employee.employee_code, self._prefix))
        except PerSourceUnavailable:
            raise PerUnavailable() from None
        return self._renderer.render(payslip_sheet(document, period, employee.employee_code))


class GetMyStatementPdf:
    """US-1024 : le relevé PER entre deux jours, en PDF ; seules les deux dates viennent du navigateur."""

    def __init__(self, my_per: GetMyPer, employees: EmployeeRepository, renderer: StatementRenderer) -> None:
        self._my_per = my_per
        self._employees = employees
        self._renderer = renderer

    def execute(self, employee_id: str, start: str, end: str) -> tuple[bytes, str]:
        photos = statement_between(self._my_per.execute(employee_id), start, end)
        code = get_employee(self._employees, employee_id).employee_code
        name = next((photo.name for photo in self._my_per.execute(employee_id) if photo.name), "")
        sheet = StatementSheet(code, name, start, end, photos)
        return self._renderer.render(sheet), statement_filename(sheet.start, sheet.end)
