from dataclasses import dataclass
from datetime import date

from app.employee.domain.affectation import AffectationLabels, UnitDirectory
from app.employee.domain.completion import Completion, completion
from app.employee.domain.dossier import DossierReader
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.update.application.use_cases import UpdateView, update_view
from app.update.application.values import current_values
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
    affectation: AffectationLabels
    """US-201 CA-01 : libellés officiels ; jamais la valeur brute de l'export."""
    position: str
    grade: str
    level: str
    contract_nature: str
    hire_date: date | None
    editable_fields: list[str]
    update: UpdateView
    completion: Completion
    """US-201 CA-02 : « Votre dossier est complet à X % »."""


EMPLOYEE_EDITABLE_FIELDS = ("telephone_number", "email_address", "address_line_1")
"""US-206 : l'employé ne modifie plus que ses coordonnées, dans la section 1 / 3 du profil (US-202)."""


class GetEmployeeProfile:
    """US-05 : profil de l'employé connecté (valeurs soumises affichées, D-05) ;
    US-201 : affectation en libellés officiels et pourcentage du dossier ;
    US-202 : coordonnées confirmées dans le dossier, sinon celles de l'export."""

    def __init__(
        self, employees: EmployeeRepository, updates: UpdateRepository, units: UnitDirectory, dossier: DossierReader
    ) -> None:
        self._employees = employees
        self._updates = updates
        self._units = units
        self._dossier = dossier

    def execute(self, employee_id: str) -> ProfileView:
        employee = get_employee(self._employees, employee_id)
        update = self._updates.get_for_employee(employee_id)
        values = current_values(employee, update)
        dossier = self._dossier.execute(employee_id)
        return ProfileView(
            employee_code=employee.employee_code,
            last_name=values["last_name"],
            first_name=values["first_name"],
            gender=employee.gender,
            birth_date=employee.birth_date,
            telephone_number=dossier.telephone or values["telephone_number"],
            email_address=(dossier.email or "") if "email" in dossier.done else values["email_address"],
            address_line_1=dossier.address or values["address_line_1"],
            affectation=self._units.execute(employee.agency_code, employee.department),
            position=employee.position,
            grade=employee.grade,
            level=employee.level,
            contract_nature=employee.contract_nature,
            hire_date=employee.hire_date,
            editable_fields=list(EMPLOYEE_EDITABLE_FIELDS),
            update=update_view(update),
            completion=completion(dossier.done),
        )

