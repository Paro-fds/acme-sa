from app.admin.domain.errors import AccountNotActivated
from app.auth.application.sessions import SessionService
from app.auth.domain.model import SubjectType
from app.auth.domain.ports import AccountRepository
from app.employee.domain.repository import EmployeeRepository, get_employee


class ResetAccess:
    """US-22 : seule écriture de l'administrateur (D-06).

    Efface le mot de passe, lève le blocage et ferme les sessions de l'employé ;
    le dossier (brouillon, mise à jour, changements, documents) n'est pas touché.
    """

    def __init__(self, employees: EmployeeRepository, accounts: AccountRepository, sessions: SessionService) -> None:
        self._employees = employees
        self._accounts = accounts
        self._sessions = sessions

    def execute(self, employee_id: str) -> None:
        # Seul un employé actif du CSV est accepté : la ligne « admin » de la table des comptes reste hors d'atteinte.
        employee = get_employee(self._employees, employee_id)
        account = self._accounts.get(employee.id)
        if account is None or not account.has_password:
            raise AccountNotActivated()
        account.password_hash = None
        account.register_success()
        self._accounts.save(account)
        self._sessions.close_all_for(SubjectType.EMPLOYEE, employee.id)
