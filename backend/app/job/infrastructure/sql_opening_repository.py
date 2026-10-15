from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, String, Text, delete, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.job.domain.opening import Actor, Criteria, CriteriaChange, JobOpening, OpeningStatus, StatusChange
from app.shared.infrastructure.database import Base, Database, UtcDateTime

_LINES = "\n"


class OpeningRow(Base):
    __tablename__ = "job_opening"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True)
    title: Mapped[str] = mapped_column(String)
    unit_code: Mapped[str] = mapped_column(String)
    target_grade: Mapped[str] = mapped_column(String)
    mission: Mapped[str] = mapped_column(Text)
    opens_on: Mapped[date] = mapped_column(Date)
    closes_on: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String, index=True)
    min_level: Mapped[str | None] = mapped_column(String, nullable=True)
    min_years_in_institution: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_years_in_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_grade: Mapped[str | None] = mapped_column(String, nullable=True)
    profile_code: Mapped[str | None] = mapped_column(String, nullable=True)


class OpeningDomainRow(Base):
    """US-115 : un domaine accepté par le poste, une ligne par domaine (dans l'ordre de la liste des domaines)."""

    __tablename__ = "job_opening_domain"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opening_id: Mapped[int] = mapped_column(ForeignKey("job_opening.id"), index=True)
    domain: Mapped[str] = mapped_column(String)


class OpeningUnitRow(Base):
    """US-115 : une unité dont les employés voient le poste, une ligne par unité (dans l'ordre choisi)."""

    __tablename__ = "job_opening_unit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opening_id: Mapped[int] = mapped_column(ForeignKey("job_opening.id"), index=True)
    unit_code: Mapped[str] = mapped_column(String)


class OpeningStepRow(Base):
    """CA-02 : chaque statut, avec sa date et son auteur ; on n'efface jamais une ligne."""

    __tablename__ = "job_opening_step"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opening_id: Mapped[int] = mapped_column(ForeignKey("job_opening.id"), index=True)
    status: Mapped[str] = mapped_column(String)
    at: Mapped[datetime] = mapped_column(UtcDateTime)
    actor_id: Mapped[str] = mapped_column(String)
    actor_name: Mapped[str] = mapped_column(String)


class CriteriaChangeRow(Base):
    """CA-02 : critères avant et après une modification faite après publication."""

    __tablename__ = "job_opening_criteria_change"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opening_id: Mapped[int] = mapped_column(ForeignKey("job_opening.id"), index=True)
    at: Mapped[datetime] = mapped_column(UtcDateTime)
    actor_id: Mapped[str] = mapped_column(String)
    actor_name: Mapped[str] = mapped_column(String)
    before: Mapped[str] = mapped_column(Text)
    after: Mapped[str] = mapped_column(Text)


def _write(row: OpeningRow, opening: JobOpening) -> None:
    row.code = opening.code
    row.title = opening.title
    row.unit_code = opening.unit_code
    row.target_grade = opening.target_grade
    row.mission = opening.mission
    row.opens_on = opening.opens_on
    row.closes_on = opening.closes_on
    row.status = opening.status.value
    row.profile_code = opening.profile_code
    criteria = opening.criteria
    row.min_level = criteria.min_level
    row.min_years_in_institution = criteria.min_years_in_institution
    row.min_years_in_position = criteria.min_years_in_position
    row.min_grade = criteria.min_grade


def _write_lists(session: Session, opening: JobOpening) -> None:
    """Domaines et unités du poste : remplacés à chaque enregistrement (les critères avant/après sont tracés à part)."""
    session.execute(delete(OpeningDomainRow).where(OpeningDomainRow.opening_id == opening.id))
    session.execute(delete(OpeningUnitRow).where(OpeningUnitRow.opening_id == opening.id))
    session.add_all(OpeningDomainRow(opening_id=opening.id, domain=code) for code in opening.criteria.domains)
    session.add_all(OpeningUnitRow(opening_id=opening.id, unit_code=code) for code in opening.criteria.unit_codes)


def _split(text: str) -> tuple[str, ...]:
    return tuple(line for line in text.split(_LINES) if line)


class SqlOpeningRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def add(self, opening: JobOpening) -> JobOpening:
        with self._database.session() as session:
            row = OpeningRow()
            _write(row, opening)
            session.add(row)
            session.flush()
            opening.id = row.id
            _write_lists(session, opening)
            self._append_children(session, opening)
        return opening

    def get(self, opening_id: int) -> JobOpening | None:
        with self._database.session() as session:
            row = session.get(OpeningRow, opening_id)
            return self._load(session, row) if row else None

    def save(self, opening: JobOpening) -> None:
        with self._database.session() as session:
            row = session.get(OpeningRow, opening.id)
            _write(row, opening)
            _write_lists(session, opening)
            self._append_children(session, opening)

    def code_taken(self, code: str, except_id: int | None = None) -> bool:
        with self._database.session() as session:
            query = select(OpeningRow.id).where(OpeningRow.code == code)
            if except_id is not None:
                query = query.where(OpeningRow.id != except_id)
            return session.scalar(query) is not None

    def list_all(self) -> list[JobOpening]:
        with self._database.session() as session:
            rows = session.scalars(select(OpeningRow).order_by(OpeningRow.id.desc()))
            return [self._load(session, row) for row in rows]

    def _append_children(self, session: Session, opening: JobOpening) -> None:
        """Ajoute seulement les étapes et traces nouvelles : les anciennes ne sont jamais réécrites."""
        steps = session.scalar(select(func.count()).where(OpeningStepRow.opening_id == opening.id))
        for change in opening.history[steps:]:
            session.add(
                OpeningStepRow(
                    opening_id=opening.id,
                    status=change.status.value,
                    at=change.at,
                    actor_id=change.actor.id,
                    actor_name=change.actor.name,
                )
            )
        traced = session.scalar(select(func.count()).where(CriteriaChangeRow.opening_id == opening.id))
        for change in opening.criteria_changes[traced:]:
            session.add(
                CriteriaChangeRow(
                    opening_id=opening.id,
                    at=change.at,
                    actor_id=change.actor.id,
                    actor_name=change.actor.name,
                    before=_LINES.join(change.before),
                    after=_LINES.join(change.after),
                )
            )

    def _load(self, session: Session, row: OpeningRow) -> JobOpening:
        steps = session.scalars(
            select(OpeningStepRow).where(OpeningStepRow.opening_id == row.id).order_by(OpeningStepRow.id)
        )
        changes = session.scalars(
            select(CriteriaChangeRow).where(CriteriaChangeRow.opening_id == row.id).order_by(CriteriaChangeRow.id)
        )
        domains = session.scalars(
            select(OpeningDomainRow.domain).where(OpeningDomainRow.opening_id == row.id).order_by(OpeningDomainRow.id)
        )
        units = session.scalars(
            select(OpeningUnitRow.unit_code).where(OpeningUnitRow.opening_id == row.id).order_by(OpeningUnitRow.id)
        )
        return JobOpening(
            id=row.id,
            code=row.code,
            title=row.title,
            unit_code=row.unit_code,
            target_grade=row.target_grade,
            mission=row.mission,
            opens_on=row.opens_on,
            closes_on=row.closes_on,
            criteria=Criteria(
                min_level=row.min_level,
                domains=tuple(domains),
                min_years_in_institution=row.min_years_in_institution,
                min_years_in_position=row.min_years_in_position,
                min_grade=row.min_grade,
                unit_codes=tuple(units),
            ),
            status=OpeningStatus(row.status),
            profile_code=row.profile_code,
            history=[
                StatusChange(OpeningStatus(step.status), step.at, Actor(step.actor_id, step.actor_name)) for step in steps
            ],
            criteria_changes=[
                CriteriaChange(change.at, Actor(change.actor_id, change.actor_name), _split(change.before), _split(change.after))
                for change in changes
            ],
        )
