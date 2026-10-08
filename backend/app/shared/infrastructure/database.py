"""Accès à la base via SQLAlchemy : SQLite (poste du développeur, tests) ou PostgreSQL (démonstrateur, AWS)."""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime

from sqlalchemy import DateTime, create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


class UtcDateTime(TypeDecorator):
    """Dates stockées en UTC sans fuseau (SQLite ne le conserve pas) et restituées en UTC à la lecture."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC)


def create_database_engine(database_url: str) -> Engine:
    if not database_url.startswith("sqlite"):
        # PostgreSQL : connexions vérifiées avant usage (la base gratuite se met en veille) ; pas de requêtes
        # préparées côté serveur, refusées par le pooler de Supabase en mode transaction.
        return create_engine(database_url, pool_pre_ping=True, pool_size=5, connect_args={"prepare_threshold": None})

    engine = create_engine(database_url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


class Database:
    def __init__(self, database_url: str) -> None:
        self.engine = create_database_engine(database_url)
        self._session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)

    def create_schema(self) -> None:
        Base.metadata.create_all(self.engine)

    def dispose(self) -> None:
        self.engine.dispose()

    @contextmanager
    def session(self) -> Iterator[Session]:
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
