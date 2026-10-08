"""Alembic : applique les migrations à la base de `DATABASE_URL` (ou à l'adresse passée par `config.attributes`)."""

from alembic import context
import app.container  # noqa: F401  (charge toutes les tables dans Base.metadata)
from app.config import Settings
from app.shared.infrastructure.database import Base, create_database_engine

config = context.config
target_metadata = Base.metadata


def _url() -> str:
    return config.attributes.get("database_url") or Settings().database_url


def run_migrations_offline() -> None:
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return
    engine = create_database_engine(_url())
    with engine.connect() as connection:
        _run(connection)
    engine.dispose()


def _run(connection) -> None:
    # render_as_batch : les ALTER TABLE passent aussi sur SQLite (poste du développeur).
    context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
