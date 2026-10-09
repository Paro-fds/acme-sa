from datetime import datetime

from sqlalchemy import Boolean, Integer, String, delete, func, select
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.domain.admin import AdminAccount, AdminRole, RoleChange
from app.auth.domain.logins import EmployeeLogin
from app.auth.domain.mfa import MfaMethod, PendingCode
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


class AdminAccountRow(Base):
    __tablename__ = "admin_account"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String)
    username_key: Mapped[str] = mapped_column(String, unique=True)
    """Identifiant en minuscules : unicité sans tenir compte des majuscules (US-23)."""
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, default="ADMIN")
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime)
    created_by: Mapped[str | None] = mapped_column(String, nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # US-102 : double authentification
    mfa_method: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_secret: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_destination: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_pending_method: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_pending_secret: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_pending_destination: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_code_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    mfa_code_expires_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    mfa_change_allowed_until: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


class RoleChangeRow(Base):
    """US-103 CA-03 : trace de chaque changement de rôle d'un compte RH."""

    __tablename__ = "admin_role_change"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[str] = mapped_column(String, index=True)
    actor_id: Mapped[str] = mapped_column(String)
    old_role: Mapped[str] = mapped_column(String)
    new_role: Mapped[str] = mapped_column(String)
    at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


def _method(value: str | None) -> MfaMethod | None:
    return MfaMethod(value) if value else None


def _role(value: str | None) -> AdminRole:
    try:
        return AdminRole(value) if value else AdminRole.ADMIN
    except ValueError:
        return AdminRole.ADMIN


def _admin(row: AdminAccountRow) -> AdminAccount:
    return AdminAccount(
        id=row.id,
        username=row.username,
        password_hash=row.password_hash,
        role=_role(row.role),
        created_at=row.created_at,
        created_by=row.created_by,
        must_change_password=row.must_change_password,
        failed_attempts=row.failed_attempts,
        locked_until=row.locked_until,
        last_login_at=row.last_login_at,
        mfa_method=_method(row.mfa_method),
        mfa_secret=row.mfa_secret,
        mfa_destination=row.mfa_destination,
        mfa_pending_method=_method(row.mfa_pending_method),
        mfa_pending_secret=row.mfa_pending_secret,
        mfa_pending_destination=row.mfa_pending_destination,
        mfa_code=PendingCode(row.mfa_code_hash, row.mfa_code_expires_at) if row.mfa_code_hash else None,
        mfa_change_allowed_until=row.mfa_change_allowed_until,
    )


def _admin_row(account: AdminAccount) -> AdminAccountRow:
    return AdminAccountRow(
        id=account.id,
        username=account.username,
        username_key=account.username.casefold(),
        password_hash=account.password_hash,
        role=account.role.value if account.role else AdminRole.ADMIN.value,
        must_change_password=account.must_change_password,
        failed_attempts=account.failed_attempts,
        locked_until=account.locked_until,
        created_at=account.created_at,
        created_by=account.created_by,
        last_login_at=account.last_login_at,
        mfa_method=account.mfa_method.value if account.mfa_method else None,
        mfa_secret=account.mfa_secret,
        mfa_destination=account.mfa_destination,
        mfa_pending_method=account.mfa_pending_method.value if account.mfa_pending_method else None,
        mfa_pending_secret=account.mfa_pending_secret,
        mfa_pending_destination=account.mfa_pending_destination,
        mfa_code_hash=account.mfa_code.code_hash if account.mfa_code else None,
        mfa_code_expires_at=account.mfa_code.expires_at if account.mfa_code else None,
        mfa_change_allowed_until=account.mfa_change_allowed_until,
    )


class SqlAdminAccountRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def list_all(self) -> list[AdminAccount]:
        with self._database.session() as session:
            rows = session.scalars(select(AdminAccountRow).order_by(AdminAccountRow.created_at, AdminAccountRow.username))
            return [_admin(row) for row in rows]

    def get(self, admin_id: str) -> AdminAccount | None:
        with self._database.session() as session:
            row = session.get(AdminAccountRow, admin_id)
            return _admin(row) if row else None

    def find_by_username(self, username: str) -> AdminAccount | None:
        with self._database.session() as session:
            row = session.scalars(select(AdminAccountRow).where(AdminAccountRow.username == username)).first()
            return _admin(row) if row else None

    def username_taken(self, username: str) -> bool:
        with self._database.session() as session:
            key = username.casefold()
            return session.scalars(select(AdminAccountRow.id).where(AdminAccountRow.username_key == key)).first() is not None

    def add(self, account: AdminAccount) -> None:
        with self._database.session() as session:
            session.add(_admin_row(account))

    def save(self, account: AdminAccount) -> None:
        with self._database.session() as session:
            session.merge(_admin_row(account))

    def delete(self, admin_id: str) -> None:
        with self._database.session() as session:
            session.execute(delete(AdminAccountRow).where(AdminAccountRow.id == admin_id))

    def count(self) -> int:
        with self._database.session() as session:
            return session.scalar(select(func.count()).select_from(AdminAccountRow)) or 0

    def record_role_change(self, change: RoleChange) -> None:
        with self._database.session() as session:
            session.add(
                RoleChangeRow(
                    admin_id=change.admin_id,
                    actor_id=change.actor_id,
                    old_role=change.old_role.value if isinstance(change.old_role, AdminRole) else str(change.old_role),
                    new_role=change.new_role.value if isinstance(change.new_role, AdminRole) else str(change.new_role),
                    at=change.at,
                )
            )

    def list_role_changes(self, admin_id: str | None = None) -> list[RoleChange]:
        with self._database.session() as session:
            stmt = select(RoleChangeRow).order_by(RoleChangeRow.at.desc(), RoleChangeRow.id.desc())
            if admin_id:
                stmt = stmt.where(RoleChangeRow.admin_id == admin_id)
            rows = session.scalars(stmt)
            return [
                RoleChange(
                    id=row.id,
                    admin_id=row.admin_id,
                    actor_id=row.actor_id,
                    old_role=_role(row.old_role),
                    new_role=_role(row.new_role),
                    at=row.at,
                )
                for row in rows
            ]


class EmployeeLoginRow(Base):
    """US-605 : une ligne par connexion réussie d'un employé."""

    __tablename__ = "employee_login"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class SqlLoginJournal:
    def __init__(self, database: Database) -> None:
        self._database = database

    def record(self, login: EmployeeLogin) -> None:
        with self._database.session() as session:
            session.add(EmployeeLoginRow(employee_id=login.employee_id, at=login.at))

    def all(self) -> list[EmployeeLogin]:
        with self._database.session() as session:
            rows = session.scalars(select(EmployeeLoginRow).order_by(EmployeeLoginRow.id))
            return [EmployeeLogin(r.employee_id, r.at) for r in rows]

    def since(self, moment: datetime) -> list[EmployeeLogin]:
        with self._database.session() as session:
            rows = session.scalars(
                select(EmployeeLoginRow).where(EmployeeLoginRow.at >= moment).order_by(EmployeeLoginRow.id)
            )
            return [EmployeeLogin(r.employee_id, r.at) for r in rows]
