"""US-501 : tables du référentiel (modèle de données §6.2 → §6.5)."""

from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, String, delete, select
from sqlalchemy.orm import Mapped, mapped_column

from app.referential.domain.units import Attachment, Mapping, Unit, UnitType
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class UnitRow(Base):
    __tablename__ = "unit"

    code: Mapped[str] = mapped_column(String, primary_key=True)
    label: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class FormerLabelRow(Base):
    __tablename__ = "unit_former_label"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unit_code: Mapped[str] = mapped_column(ForeignKey("unit.code"), index=True)
    label: Mapped[str] = mapped_column(String)


class AttachmentRow(Base):
    __tablename__ = "unit_attachment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unit_code: Mapped[str] = mapped_column(ForeignKey("unit.code"), index=True)
    parent_code: Mapped[str] = mapped_column(ForeignKey("unit.code"))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    imported_at: Mapped[datetime] = mapped_column(UtcDateTime)
    source: Mapped[str] = mapped_column(String)
    """Fichier d'origine et administrateur qui l'a importé (§6.4)."""


class MappingRow(Base):
    __tablename__ = "export_mapping"

    export_column: Mapped[str] = mapped_column(String, primary_key=True)
    export_value: Mapped[str] = mapped_column(String, primary_key=True)
    unit_code: Mapped[str | None] = mapped_column(ForeignKey("unit.code"), nullable=True)
    """Vide = « À rattacher » (RG-17)."""


def _attachment(row: AttachmentRow) -> Attachment:
    return Attachment(row.unit_code, row.parent_code, row.start_date, row.end_date)


class SqlReferentialRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def units(self) -> dict[str, Unit]:
        with self._database.session() as session:
            former: dict[str, list[str]] = {}
            for row in session.scalars(select(FormerLabelRow).order_by(FormerLabelRow.id)):
                former.setdefault(row.unit_code, []).append(row.label)
            return {
                row.code: Unit(row.code, row.label, UnitType(row.type), former.get(row.code, []), row.start_date, row.end_date)
                for row in session.scalars(select(UnitRow))
            }

    def current_attachments(self) -> dict[str, Attachment]:
        with self._database.session() as session:
            rows = session.scalars(select(AttachmentRow).where(AttachmentRow.end_date.is_(None)))
            return {row.unit_code: _attachment(row) for row in rows}

    def attachments_of(self, unit_code: str) -> list[Attachment]:
        with self._database.session() as session:
            rows = session.scalars(
                select(AttachmentRow).where(AttachmentRow.unit_code == unit_code).order_by(AttachmentRow.start_date, AttachmentRow.id)
            )
            return [_attachment(row) for row in rows]

    def mappings(self) -> list[Mapping]:
        with self._database.session() as session:
            rows = session.scalars(select(MappingRow).order_by(MappingRow.export_column, MappingRow.export_value))
            return [Mapping(row.export_column, row.export_value, row.unit_code) for row in rows]

    def save_import(
        self,
        units: list[Unit],
        closed: list[Attachment],
        opened: list[Attachment],
        mappings: list[Mapping],
        source: str,
        imported_at: datetime,
    ) -> None:
        with self._database.session() as session:
            for unit in units:
                session.merge(UnitRow(code=unit.code, label=unit.label, type=unit.type.value, start_date=unit.start, end_date=unit.end))
            session.flush()
            known = {
                (row.unit_code, row.label)
                for row in session.scalars(select(FormerLabelRow).where(FormerLabelRow.unit_code.in_([u.code for u in units])))
            }
            for unit in units:
                for label in unit.former_labels:
                    if (unit.code, label) not in known:
                        session.add(FormerLabelRow(unit_code=unit.code, label=label))
            for attachment in closed:
                row = session.scalars(
                    select(AttachmentRow).where(
                        AttachmentRow.unit_code == attachment.unit_code, AttachmentRow.end_date.is_(None)
                    )
                ).first()
                if row is not None:
                    row.end_date = attachment.end
            session.flush()
            for attachment in opened:
                session.add(
                    AttachmentRow(
                        unit_code=attachment.unit_code,
                        parent_code=attachment.parent_code,
                        start_date=attachment.start,
                        imported_at=imported_at,
                        source=source,
                    )
                )
            session.execute(delete(MappingRow))
            for mapping in mappings:
                session.add(MappingRow(export_column=mapping.column, export_value=mapping.value, unit_code=mapping.unit_code))
