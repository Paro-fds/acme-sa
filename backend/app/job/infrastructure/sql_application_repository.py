from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.job.domain.application import ApplicationStep, ApplicationStepChange, CvFile, JobApplication, Outcome
from app.job.domain.opening import Actor
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class ApplicationRow(Base):
    """US-902 : une candidature ; aucune ligne n'est jamais supprimée (RG-74)."""

    __tablename__ = "job_application"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    opening_id: Mapped[int] = mapped_column(ForeignKey("job_opening.id"), index=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    motivation: Mapped[str] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(UtcDateTime)
    step: Mapped[str] = mapped_column(String)
    outcome: Mapped[str | None] = mapped_column(String, nullable=True)
    cv_key: Mapped[str | None] = mapped_column(String, nullable=True)
    cv_name: Mapped[str | None] = mapped_column(String, nullable=True)
    cv_content_type: Mapped[str | None] = mapped_column(String, nullable=True)
    cv_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    profile_snapshot: Mapped[str] = mapped_column(Text, default="")
    """Profil au moment de la candidature, une ligne par information ; jamais réécrit."""


class ApplicationStepRow(Base):
    __tablename__ = "job_application_step"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("job_application.id"), index=True)
    step: Mapped[str] = mapped_column(String)
    outcome: Mapped[str | None] = mapped_column(String, nullable=True)
    at: Mapped[datetime] = mapped_column(UtcDateTime)
    actor_id: Mapped[str] = mapped_column(String)
    actor_name: Mapped[str] = mapped_column(String)


class SqlApplicationRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def add(self, application: JobApplication) -> JobApplication:
        with self._database.session() as session:
            row = ApplicationRow(
                opening_id=application.opening_id,
                employee_id=application.employee_id,
                motivation=application.motivation,
                received_at=application.received_at,
                step=application.step.value,
                outcome=None,
                cv_key=application.cv.key if application.cv else None,
                cv_name=application.cv.name if application.cv else None,
                cv_content_type=application.cv.content_type if application.cv else None,
                cv_size_bytes=application.cv.size_bytes if application.cv else None,
                profile_snapshot="\n".join(application.profile_snapshot),
            )
            session.add(row)
            session.flush()
            application.id = row.id
            self._append_steps(session, application)
        return application

    def get(self, application_id: int) -> JobApplication | None:
        with self._database.session() as session:
            row = session.get(ApplicationRow, application_id)
            return self._load(session, row) if row else None

    def save(self, application: JobApplication) -> None:
        with self._database.session() as session:
            row = session.get(ApplicationRow, application.id)
            row.step = application.step.value
            row.outcome = application.outcome.value if application.outcome else None
            self._append_steps(session, application)

    def for_employee(self, employee_id: str) -> list[JobApplication]:
        with self._database.session() as session:
            rows = session.scalars(
                select(ApplicationRow).where(ApplicationRow.employee_id == employee_id).order_by(ApplicationRow.id.desc())
            )
            return [self._load(session, row) for row in rows]

    def for_opening(self, opening_id: int) -> list[JobApplication]:
        with self._database.session() as session:
            rows = session.scalars(
                select(ApplicationRow).where(ApplicationRow.opening_id == opening_id).order_by(ApplicationRow.id)
            )
            return [self._load(session, row) for row in rows]

    def _append_steps(self, session: Session, application: JobApplication) -> None:
        """Ajoute seulement les étapes nouvelles : l'historique n'est jamais réécrit."""
        known = session.scalar(select(func.count()).where(ApplicationStepRow.application_id == application.id))
        for change in application.history[known:]:
            session.add(
                ApplicationStepRow(
                    application_id=application.id,
                    step=change.step.value,
                    outcome=change.outcome.value if change.outcome else None,
                    at=change.at,
                    actor_id=change.actor.id,
                    actor_name=change.actor.name,
                )
            )

    def _load(self, session: Session, row: ApplicationRow) -> JobApplication:
        steps = session.scalars(
            select(ApplicationStepRow).where(ApplicationStepRow.application_id == row.id).order_by(ApplicationStepRow.id)
        )
        return JobApplication(
            id=row.id,
            opening_id=row.opening_id,
            employee_id=row.employee_id,
            motivation=row.motivation,
            received_at=row.received_at,
            step=ApplicationStep(row.step),
            outcome=Outcome(row.outcome) if row.outcome else None,
            cv=CvFile(row.cv_key, row.cv_name, row.cv_content_type, row.cv_size_bytes) if row.cv_key else None,
            profile_snapshot=tuple(line for line in (row.profile_snapshot or "").split("\n") if line),
            history=[
                ApplicationStepChange(
                    ApplicationStep(step.step), step.at, Actor(step.actor_id, step.actor_name),
                    Outcome(step.outcome) if step.outcome else None,
                )
                for step in steps
            ],
        )
