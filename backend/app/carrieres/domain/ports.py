from typing import Protocol

from app.carrieres.domain.pieces import CarrieresEmployee, MyPiece, NewPiece, PieceFile


class CarrieresPieces(Protocol):
    """Les pièces des employés dans la base de Carrières : lecture et ajout seuls (D-50)."""

    def active_employee(self, code: str) -> CarrieresEmployee | None:
        """L'employé de `employes` dont le code est dans `vault_actifs` ; rien sinon."""
        ...

    def has_fingerprint(self, employee_id: int, fingerprint: str) -> bool: ...

    def deposit(self, piece: NewPiece) -> int:
        """Ajoute la pièce, son scan et l'entrée `versement_document` du journal, en une transaction ; rend l'id."""
        ...

    def pieces_of(self, employee_id: int) -> list[MyPiece]:
        """US-1008 : ses formations et ses pièces pas encore qualifiées, les plus récentes d'abord."""
        ...

    def file_of(self, employee_id: int, piece_id: int) -> PieceFile | None:
        """Le scan d'une de ses pièces ; rien si la pièce n'est pas à lui ou n'a pas de scan."""
        ...
