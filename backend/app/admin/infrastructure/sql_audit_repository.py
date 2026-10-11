from datetime import datetime

from sqlalchemy import Integer, String, select
from sqlalchemy.orm import Mapped, mapped_column

from app.admin.domain.audit import AuditEntry
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class AuditLogRow(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)
    actor_id: Mapped[str] = mapped_column(String, index=True)
    actor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String)
    target_id: Mapped[str] = mapped_column(String, index=True)
    target_name: Mapped[str | None] = mapped_column(String, nullable=True)
    details: Mapped[str | None] = mapped_column(String, nullable=True)


class SqlAuditRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def add(self, entry: AuditEntry) -> None:
        with self._database.session() as session:
            session.add(
                AuditLogRow(
                    at=entry.at,
                    actor_id=entry.actor_id,
                    actor_name=entry.actor_name,
                    action=entry.action,
                    target_id=entry.target_id,
                    target_name=entry.target_name,
                    details=entry.details,
                )
            )

    def list_all(
        self,
        actor: str | None = None,
        target_id: str | None = None,
        action: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> list[AuditEntry]:
        with self._database.session() as session:
            query = select(AuditLogRow).order_by(AuditLogRow.at.desc(), AuditLogRow.id.desc())
            if actor:
                query = query.where(AuditLogRow.actor_id == actor)
            if target_id:
                query = query.where(AuditLogRow.target_id == target_id)
            if action:
                query = query.where(AuditLogRow.action == action)
            if since:
                query = query.where(AuditLogRow.at >= since)
            if until:
                query = query.where(AuditLogRow.at <= until)
            rows = session.scalars(query)
            return [
                AuditEntry(
                    id=r.id,
                    at=r.at,
                    actor_id=r.actor_id,
                    actor_name=r.actor_name,
                    action=r.action,
                    target_id=r.target_id,
                    target_name=r.target_name,
                    details=r.details,
                )
                for r in rows
            ]
