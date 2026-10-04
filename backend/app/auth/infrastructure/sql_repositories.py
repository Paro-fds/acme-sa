from datetime import datetime

from sqlalchemy import Integer, String, delete
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.domain.model import Account, Session, SubjectType
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class AccountRow(Base):
    __tablename__ = "employee_account"

    employee_id: Mapped[str] = mapped_column(String, primary_key=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


class SessionRow(Base):
    __tablename__ = "session"

    token_hash: Mapped[str] = mapped_column(String, primary_key=True)
    subject_type: Mapped[str] = mapped_column(String)
    subject_id: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    last_seen_at: Mapped[datetime] = mapped_column(UtcDateTime)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime)


class SqlAccountRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def get(self, employee_id: str) -> Account | None:
        with self._database.session() as session:
            row = session.get(AccountRow, employee_id)
            if row is None:
                return None
            return Account(
                employee_id=row.employee_id,
                password_hash=row.password_hash,
                failed_attempts=row.failed_attempts,
                locked_until=row.locked_until,
            )

    def save(self, account: Account) -> None:
        with self._database.session() as session:
            session.merge(
                AccountRow(
                    employee_id=account.employee_id,
                    password_hash=account.password_hash,
                    failed_attempts=account.failed_attempts,
                    locked_until=account.locked_until,
                )
            )


class SqlSessionRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def get(self, token_hash: str) -> Session | None:
        with self._database.session() as session:
            row = session.get(SessionRow, token_hash)
            if row is None:
                return None
            return Session(
                token_hash=row.token_hash,
                subject_type=SubjectType(row.subject_type),
                subject_id=row.subject_id,
                created_at=row.created_at,
                last_seen_at=row.last_seen_at,
                expires_at=row.expires_at,
            )

    def save(self, value: Session) -> None:
        with self._database.session() as session:
            session.merge(
                SessionRow(
                    token_hash=value.token_hash,
                    subject_type=value.subject_type.value,
                    subject_id=value.subject_id,
                    created_at=value.created_at,
                    last_seen_at=value.last_seen_at,
                    expires_at=value.expires_at,
                )
            )

    def delete(self, token_hash: str) -> None:
        with self._database.session() as session:
            session.execute(delete(SessionRow).where(SessionRow.token_hash == token_hash))

    def delete_for_subject(self, subject_type: SubjectType, subject_id: str) -> None:
        with self._database.session() as session:
            session.execute(
                delete(SessionRow).where(
                    SessionRow.subject_type == subject_type.value,
                    SessionRow.subject_id == subject_id,
                )
            )
