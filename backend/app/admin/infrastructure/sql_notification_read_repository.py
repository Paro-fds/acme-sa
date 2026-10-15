from datetime import datetime

from sqlalchemy import Integer, String, delete, select
from sqlalchemy.orm import Mapped, mapped_column

from app.admin.domain.notifications import ReadState
from app.shared.infrastructure.database import Base, Database, UtcDateTime

_ALL = "*"
"""Clé de la ligne « Tout marquer comme lu » : tout ce qui précède `read_at` est lu."""


class NotificationReadRow(Base):
    """US-116 CA-04 : une notification lue par un compte RH (ou « tout lu » jusqu'à `read_at`)."""

    __tablename__ = "admin_notification_read"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[str] = mapped_column(String, index=True)
    key: Mapped[str] = mapped_column(String)
    read_at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class SqlNotificationReadRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def state(self, admin_id: str) -> ReadState:
        with self._database.session() as session:
            rows = session.scalars(select(NotificationReadRow).where(NotificationReadRow.admin_id == admin_id)).all()
            keys = frozenset(row.key for row in rows if row.key != _ALL)
            all_before = max((row.read_at for row in rows if row.key == _ALL), default=None)
            return ReadState(keys, all_before)

    def mark(self, admin_id: str, key: str, at: datetime) -> None:
        with self._database.session() as session:
            exists = session.scalar(
                select(NotificationReadRow.id).where(NotificationReadRow.admin_id == admin_id, NotificationReadRow.key == key)
            )
            if exists is None:
                session.add(NotificationReadRow(admin_id=admin_id, key=key, read_at=at))

    def mark_all(self, admin_id: str, at: datetime) -> None:
        with self._database.session() as session:
            session.execute(delete(NotificationReadRow).where(NotificationReadRow.admin_id == admin_id))
            session.add(NotificationReadRow(admin_id=admin_id, key=_ALL, read_at=at))

    def purge(self, before: datetime) -> None:
        with self._database.session() as session:
            session.execute(delete(NotificationReadRow).where(NotificationReadRow.read_at < before))
