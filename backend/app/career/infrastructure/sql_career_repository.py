from datetime import date, datetime

from sqlalchemy import Date, Integer, String, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.career.domain.career_entry import CareerEntry, CareerProfile, Proof
from app.career.domain.entry_kinds import EntryKind, QualificationType, SkillLevel
from app.career.domain.months import Month
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class CareerEntryRow(Base):
    """Une table pour les quatre rubriques (AD-V2-03) ; justificatif dans les colonnes `proof_*` (AD-V2-04)."""

    __tablename__ = "career_entry"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    kind: Mapped[str] = mapped_column(String)
    qualification_type: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String)
    organization: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    start_month: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_month: Mapped[date | None] = mapped_column(Date, nullable=True)
    duration_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    skill_level: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)
    proof_original_name: Mapped[str | None] = mapped_column(String, nullable=True)
    proof_stored_name: Mapped[str | None] = mapped_column(String, nullable=True)
    proof_content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    proof_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    proof_uploaded_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


class CareerProfileRow(Base):
    """Suivi du parcours par employé (AD-V2-08) : tenu à jour dans la transaction de chaque écriture."""

    __tablename__ = "career_profile"

    employee_id: Mapped[str] = mapped_column(String, primary_key=True)
    entry_count: Mapped[int] = mapped_column(Integer)
    last_changed_at: Mapped[datetime] = mapped_column(UtcDateTime)


def _month(value: date | None) -> Month | None:
    return Month.of(value) if value else None


def _to_domain(row: CareerEntryRow) -> CareerEntry:
    proof = None
    if row.proof_stored_name:
        proof = Proof(
            row.proof_original_name, row.proof_stored_name, row.proof_content_type,
            row.proof_size_bytes, row.proof_uploaded_at,
        )
    return CareerEntry(
        id=row.id,
        employee_id=row.employee_id,
        kind=EntryKind(row.kind),
        created_at=row.created_at,
        updated_at=row.updated_at,
        qualification_type=QualificationType(row.qualification_type) if row.qualification_type else None,
        title=row.title,
        organization=row.organization,
        location=row.location,
        start_month=_month(row.start_month),
        end_month=_month(row.end_month),
        duration_hours=row.duration_hours,
        description=row.description,
        skill_level=SkillLevel(row.skill_level) if row.skill_level else None,
        proof=proof,
    )


def _fill(row: CareerEntryRow, entry: CareerEntry) -> None:
    proof = entry.proof
    row.employee_id = entry.employee_id
    row.kind = entry.kind.value
    row.qualification_type = entry.qualification_type.value if entry.qualification_type else None
    row.title = entry.title
    row.organization = entry.organization
    row.location = entry.location
    row.start_month = entry.start_month.first_day() if entry.start_month else None
    row.end_month = entry.end_month.first_day() if entry.end_month else None
    row.duration_hours = entry.duration_hours
    row.description = entry.description
    row.skill_level = entry.skill_level.value if entry.skill_level else None
    row.created_at = entry.created_at
    row.updated_at = entry.updated_at
    row.proof_original_name = proof.original_name if proof else None
    row.proof_stored_name = proof.stored_name if proof else None
    row.proof_content_type = proof.content_type if proof else None
    row.proof_size_bytes = proof.size_bytes if proof else None
    row.proof_uploaded_at = proof.uploaded_at if proof else None


class SqlCareerRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def list_for_employee(self, employee_id: str) -> list[CareerEntry]:
        with self._database.session() as session:
            rows = session.scalars(
                select(CareerEntryRow).where(CareerEntryRow.employee_id == employee_id).order_by(CareerEntryRow.id)
            )
            return [_to_domain(row) for row in rows]

    def profile(self, employee_id: str) -> CareerProfile | None:
        with self._database.session() as session:
            row = session.get(CareerProfileRow, employee_id)
            return CareerProfile(row.employee_id, row.entry_count, row.last_changed_at) if row else None

    def count(self, employee_id: str, kind: EntryKind) -> int:
        with self._database.session() as session:
            return session.scalar(
                select(func.count())
                .select_from(CareerEntryRow)
                .where(CareerEntryRow.employee_id == employee_id, CareerEntryRow.kind == kind.value)
            )

    def get(self, entry_id: str) -> CareerEntry | None:
        with self._database.session() as session:
            row = session.get(CareerEntryRow, entry_id)
            return _to_domain(row) if row else None

    def add(self, entry: CareerEntry, *, changed_at: datetime) -> None:
        with self._database.session() as session:
            row = CareerEntryRow(id=entry.id)
            _fill(row, entry)
            session.add(row)
            session.flush()
            self._touch_profile(session, entry.employee_id, changed_at)

    @staticmethod
    def _touch_profile(session: Session, employee_id: str, changed_at: datetime) -> None:
        """Recompte les éléments de l'employé et date la modification (même transaction que l'écriture)."""
        count = session.scalar(
            select(func.count()).select_from(CareerEntryRow).where(CareerEntryRow.employee_id == employee_id)
        )
        profile = session.get(CareerProfileRow, employee_id)
        if profile is None:
            session.add(CareerProfileRow(employee_id=employee_id, entry_count=count, last_changed_at=changed_at))
        else:
            profile.entry_count = count
            profile.last_changed_at = changed_at
