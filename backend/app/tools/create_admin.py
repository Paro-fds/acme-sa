"""Crée le premier compte administrateur, sur l'ordinateur du portail (US-23 CA-01).

Usage (depuis backend/) :
    .venv\\Scripts\\python -m app.tools.create_admin               # demande identifiant et mot de passe
    .venv\\Scripts\\python -m app.tools.create_admin --if-missing  # ne demande rien si un compte existe (run.ps1)

Le mot de passe est saisi deux fois et n'est jamais affiché. Les administrateurs suivants
s'ajoutent depuis l'écran « Administrateurs » du portail.
"""

import getpass
import sys

from app.auth.application.admin_accounts import CreateFirstAdmin, ImportConfiguredAdmin
from app.auth.infrastructure.argon2_hasher import Argon2PasswordHasher
from app.auth.infrastructure.sql_repositories import SqlAdminAccountRepository
from app.config import Settings
from app.shared.domain.errors import DomainError
from app.shared.infrastructure.clock import SystemClock
from app.shared.infrastructure.database import Database

MAX_TRIES = 3


def admin_repository(settings: Settings) -> tuple[Database, SqlAdminAccountRepository]:
    settings.acme_data_dir.mkdir(parents=True, exist_ok=True)
    database = Database(settings.database_url)
    database.create_schema()
    admins = SqlAdminAccountRepository(database)
    # Même migration qu'au démarrage du portail : un compte de l'ancienne configuration suffit.
    ImportConfiguredAdmin(admins, SystemClock(), settings.admin_username, settings.admin_password_hash).execute()
    return database, admins


def main() -> None:
    if_missing = "--if-missing" in sys.argv[1:]
    database, admins = admin_repository(Settings())
    try:
        if admins.count() > 0:
            if not if_missing:
                sys.exit("Un administrateur existe déjà : les suivants s'ajoutent depuis l'écran « Administrateurs ».")
            return
        print("Création du premier administrateur du portail.")
        print("Mot de passe : 12 caractères minimum (il ne s'affiche pas pendant la saisie).")
        create = CreateFirstAdmin(admins, Argon2PasswordHasher(), SystemClock())
        for _ in range(MAX_TRIES):
            username = input("Identifiant : ")
            password = getpass.getpass("Mot de passe : ")
            confirmation = getpass.getpass("Confirmation : ")
            try:
                admin = create.execute(username, password, confirmation)
            except DomainError as error:
                print(f"  {error.message}")
                continue
            print(f"Administrateur « {admin.username} » créé. Connexion : /admin/connexion")
            return
        sys.exit("Aucun administrateur créé.")
    finally:
        database.dispose()


if __name__ == "__main__":
    main()
