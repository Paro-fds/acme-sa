from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint, delete, select
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.infrastructure.database import Base, Database, UtcDateTime
from app.update.domain.update import EmployeeUpdate, FieldChange, UpdateStatus


class UpdateRow(Base):
    __tablename__ = "employee_update"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String)
    accepted: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime)
    submitted_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    changes: Mapped[list["ChangeRow"]] = relationship(lazy="selectin", viewonly=True)
    submitted_changes: Mapped[list["SubmittedChangeRow"]] = relationship(lazy="selectin", viewonly=True)


class ChangeRow(Base):
    __tablename__ = "employee_change"
    __table_args__ = (UniqueConstraint("update_id", "field_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    update_id: Mapped[int] = mapped_column(ForeignKey("employee_update.id", ondelete="CASCADE"))
    field_name: Mapped[str] = mapped_column(String)
    old_value: Mapped[str] = mapped_column(String)
    new_value: Mapped[str] = mapped_column(String)
    changed_at: Mapped[datetime] = mapped_column(UtcDateTime)


class SubmittedChangeRow(Base):
    """Copie des changements du dernier envoi (US-24) : lue par l'administration et l'identification."""

    __tablename__ = "employee_submitted_change"
    __table_args__ = (UniqueConstraint("update_id", "field_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    update_id: Mapped[int] = mapped_column(ForeignKey("employee_update.id", ondelete="CASCADE"))
    field_name: Mapped[str] = mapped_column(String)
    old_value: Mapped[str] = mapped_column(String)
    new_value: Mapped[str] = mapped_column(String)
    changed_at: Mapped[datetime] = mapped_column(UtcDateTime)


def _changes(rows) -> dict[str, FieldChange]:
    return {row.field_name: FieldChange(row.field_name, row.old_value, row.new_value, row.changed_at) for row in rows}


def _to_domain(row: UpdateRow) -> EmployeeUpdate:
    changes = _changes(row.changes)
    submitted_changes = _changes(row.submitted_changes)
    if row.status == UpdateStatus.SUBMITTED and not row.submitted_changes:
        # Envoi enregistré avant US-24 (pas de copie) : les changements sont ceux de l'envoi.
        submitted_changes = _changes(row.changes)
    return EmployeeUpdate(
        employee_id=row.employee_id,
        status=UpdateStatus(row.status),
        accepted=row.accepted,
        created_at=row.created_at,
        updated_at=row.updated_at,
        submitted_at=row.submitted_at,
        changes=changes,
        submitted_changes=submitted_changes,
    )


class SqlUpdateRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def get_for_employee(self, employee_id: str) -> EmployeeUpdate | None:
        with self._database.session() as session:
            row = session.scalar(select(UpdateRow).where(UpdateRow.employee_id == employee_id))
            return _to_domain(row) if row else None

    def list_all(self) -> list[EmployeeUpdate]:
        with self._database.session() as session:
            return [_to_domain(row) for row in session.scalars(select(UpdateRow))]

    def save(self, update: EmployeeUpdate) -> None:
        with self._database.session() as session:
            row = session.scalar(select(UpdateRow).where(UpdateRow.employee_id == update.employee_id))
            if row is None:
                row = UpdateRow(employee_id=update.employee_id)
                session.add(row)
            row.status = update.status.value
            row.accepted = update.accepted
            row.created_at = update.created_at
            row.updated_at = update.updated_at
            row.submitted_at = update.submitted_at
            session.flush()

            for table, changes in ((ChangeRow, update.changes), (SubmittedChangeRow, update.submitted_changes)):
                session.execute(delete(table).where(table.update_id == row.id))
                session.add_all(
                    table(
                        update_id=row.id,
                        field_name=change.field_name,
                        old_value=change.old_value,
                        new_value=change.new_value,
                        changed_at=change.changed_at,
                    )
                    for change in changes.values()
                )
            session.expire(row, ["changes", "submitted_changes"])
