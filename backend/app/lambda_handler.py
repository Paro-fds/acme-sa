"""Point d'entrée AWS Lambda : la même application que sur le poste, derrière API Gateway (HTTP API).

Comme le module du directeur, une seule fonction sert l'API et l'écran compilé. Mangum traduit l'événement
d'API Gateway en requête ASGI : HTTPS d'origine (cookie « Secure », HSTS) et adresse du visiteur (`sourceIp`).

Migrations : dans la console Lambda, onglet « Tester », l'événement `{"action": "migrate"}` applique
`alembic upgrade head` sur DATABASE_URL, avant la première mise en service et après chaque mise à jour.

US-1027 : les mots de passe (bases, clé des codes) sont lus dans Secrets Manager avant la configuration.
"""

import os
from pathlib import Path

from mangum import Mangum

from app.main import create_app
from app.shared.infrastructure.aws_secrets import load_aws_secrets

BACKEND_DIR = Path(__file__).resolve().parent.parent

load_aws_secrets(os.environ)
_http = Mangum(create_app(), lifespan="off")


def _migrate() -> dict:
    from alembic import command
    from alembic.config import Config

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    command.upgrade(config, "head")
    return {"migrated": True}


def handler(event, context):
    if isinstance(event, dict) and event.get("action") == "migrate":
        return _migrate()
    return _http(event, context)
