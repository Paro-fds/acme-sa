"""US-1027 : les mots de passe de PAM sont lus dans Secrets Manager au démarrage de la fonction (consignes du directeur).

Le point d'entrée Lambda appelle `load_aws_secrets` avant de lire la configuration : les secrets deviennent
`DATABASE_URL`, `CARRIERES_DATABASE_URL` et `OTP_HMAC_KEY` dans la mémoire du processus seulement. Personne ne les
saisit, ni dans la console ni dans un fichier. Une valeur déjà donnée en clair (poste local) reste prioritaire.
"""

import json
import os
from collections.abc import Callable, MutableMapping
from urllib.parse import quote_plus

# (variable qui nomme le secret, variable produite, variable de l'adresse du serveur)
DATABASES = (
    ("DATABASE_SECRET_ID", "DATABASE_URL", "DATABASE_HOST"),
    ("CARRIERES_DATABASE_SECRET_ID", "CARRIERES_DATABASE_URL", "CARRIERES_DATABASE_HOST"),
)
OTP_KEY = ("OTP_HMAC_SECRET_ID", "OTP_HMAC_KEY")


class SecretUnavailable(RuntimeError):
    """Secret absent, refusé au rôle ou incomplet ; le message ne contient que son nom."""

    def __init__(self, secret_id: str) -> None:
        super().__init__(f"Le secret {secret_id} est illisible.")


def secrets_client():
    import boto3

    return boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION", "us-east-1"))


def _read(client, secret_id: str) -> str:
    try:
        value = client.get_secret_value(SecretId=secret_id).get("SecretString") or ""
    except Exception:
        raise SecretUnavailable(secret_id) from None  # le message d'AWS n'est pas repris
    if not value.strip():
        raise SecretUnavailable(secret_id)
    return value


def database_url(secret_id: str, raw: str, host: str = "") -> str:
    """`{username, password, host, port, dbname}` → adresse PostgreSQL, identifiants encodés."""
    try:
        fields = json.loads(raw)
        user, password, name = fields["username"], fields["password"], fields["dbname"]
        server = host or fields["host"]
        port = int(fields.get("port") or 5432)
    except (ValueError, KeyError, TypeError):
        raise SecretUnavailable(secret_id) from None
    if not all(str(part).strip() for part in (user, password, name, server)):
        raise SecretUnavailable(secret_id)
    return f"postgresql+psycopg://{quote_plus(str(user))}:{quote_plus(str(password))}@{server}:{port}/{name}"


def load_aws_secrets(environ: MutableMapping[str, str], client_factory: Callable | None = None) -> None:
    wanted = [(secret, target, host) for secret, target, host in DATABASES if environ.get(secret) and not environ.get(target)]
    otp_wanted = environ.get(OTP_KEY[0]) and not environ.get(OTP_KEY[1])
    if not wanted and not otp_wanted:
        return  # rien à lire : poste local, ou valeurs déjà données
    client = (client_factory or secrets_client)()
    for secret, target, host in wanted:
        secret_id = environ[secret]
        environ[target] = database_url(secret_id, _read(client, secret_id), environ.get(host, "").strip())
    if otp_wanted:
        environ[OTP_KEY[1]] = _read(client, environ[OTP_KEY[0]]).strip()
