from app.carrieres.domain.pieces import MyPiece, NotInCarrieres, PieceFile, PieceNotFound
from app.carrieres.domain.ports import CarrieresPieces
from app.employee.domain.repository import EmployeeRepository, get_employee


def _carrieres_employee(employees: EmployeeRepository, pieces: CarrieresPieces, employee_id: str):
    employee = get_employee(employees, employee_id)
    target = pieces.active_employee(employee.employee_code.strip().upper())
    if target is None:
        raise NotInCarrieres()
    return target


class ListMyPieces:
    """US-1008 : mes formations de Carrières, y compris celles recueillies par la DRH, et mes dépôts à compléter."""

    def __init__(self, employees: EmployeeRepository, pieces: CarrieresPieces) -> None:
        self._employees = employees
        self._pieces = pieces

    def execute(self, employee_id: str) -> list[MyPiece]:
        return self._pieces.pieces_of(_carrieres_employee(self._employees, self._pieces, employee_id).id)


class GetMyPieceFile:
    """US-1008 : le scan d'une de mes pièces, jamais celui d'un autre (l'identité vient de la session)."""

    def __init__(self, employees: EmployeeRepository, pieces: CarrieresPieces) -> None:
        self._employees = employees
        self._pieces = pieces

    def execute(self, employee_id: str, piece_id: int) -> PieceFile:
        target = _carrieres_employee(self._employees, self._pieces, employee_id)
        found = self._pieces.file_of(target.id, piece_id)
        if found is None:
            raise PieceNotFound()
        return found
