import hashlib
from dataclasses import dataclass

from app.carrieres.domain.pieces import (
    MAX_BYTES,
    TO_COMPLETE,
    DuplicatePiece,
    EmptyPiece,
    NewPiece,
    NotInCarrieres,
    PieceTooLarge,
    piece_title,
)
from app.carrieres.domain.ports import CarrieresPieces
from app.certificate.domain.errors import ProfileIncomplete
from app.certificate.domain.files import SIGNATURE_LENGTH, detect_kind
from app.certificate.domain.ports import ProfileStatus
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock


@dataclass(frozen=True)
class DepositedPiece:
    id: int
    title: str
    status: str


class DepositPiece:
    """US-1007 : l'employé dépose un scan, qui entre dans Carrières au statut « à compléter »."""

    def __init__(
        self, employees: EmployeeRepository, pieces: CarrieresPieces, clock: Clock, profile: ProfileStatus
    ) -> None:
        self._employees = employees
        self._pieces = pieces
        self._clock = clock
        self._profile = profile

    def execute(self, employee_id: str, file_name: str | None, content: bytes, title: str | None = None) -> DepositedPiece:
        employee = get_employee(self._employees, employee_id)
        if not self._profile.execute(employee_id):  # US-204 : le dépôt s'ouvre avec le dossier complet
            raise ProfileIncomplete()
        if not content:
            raise EmptyPiece()
        if len(content) > MAX_BYTES:
            raise PieceTooLarge()
        content_type = detect_kind(content[:SIGNATURE_LENGTH])  # PDF, JPG ou PNG, sur le contenu réel
        target = self._pieces.active_employee(employee.employee_code.strip().upper())
        if target is None:
            raise NotInCarrieres()
        fingerprint = hashlib.sha256(content).hexdigest()
        if self._pieces.has_fingerprint(target.id, fingerprint):
            raise DuplicatePiece()
        now = self._clock.now()
        piece = NewPiece(
            employee=target,
            depositor_name=f"{employee.first_name} {employee.last_name}".strip(),
            depositor_email=(employee.email_address or "").strip().lower(),
            title=piece_title(title, file_name, now.date()),
            document_date=now.date(),
            deposited_at=now,
            fingerprint=fingerprint,
            content_type=content_type,
            content=content,
        )
        return DepositedPiece(self._pieces.deposit(piece), piece.title, TO_COMPLETE)
