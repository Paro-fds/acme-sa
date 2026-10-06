from datetime import datetime
from typing import Protocol

from app.career.domain.career_entry import CareerEntry, CareerProfile
from app.career.domain.entry_kinds import EntryKind


class CareerRepository(Protocol):
    """Parcours des employés (Solution Design V2 §4).

    Chaque écriture met à jour le suivi `CareerProfile` de l'employé dans la même transaction (AD-V2-08).
    """

    def list_for_employee(self, employee_id: str) -> list[CareerEntry]: ...

    def profile(self, employee_id: str) -> CareerProfile | None: ...

    def count(self, employee_id: str, kind: EntryKind) -> int: ...

    def get(self, entry_id: str) -> CareerEntry | None: ...

    def add(self, entry: CareerEntry, *, changed_at: datetime) -> None: ...
