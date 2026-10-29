"""US-1027 — Lire les secrets de PAM dans Secrets Manager (consignes du directeur, phase B), avec un faux service."""

import json

import pytest

from app.shared.infrastructure.aws_secrets import SecretUnavailable, load_aws_secrets

PORTAIL = {"username": "pam_portail", "password": "mot/de passe@1", "host": "base.secret", "port": 5432, "dbname": "portail"}
CARRIERES = {"username": "pam_app", "password": "autre-secret", "host": "carrieres.secret", "port": 5433, "dbname": "carrieres"}


class FakeSecrets:
    def __init__(self, values: dict[str, str]) -> None:
        self.values = values
        self.asked: list[str] = []

    def get_secret_value(self, SecretId: str) -> dict:  # noqa: N803 — nom imposé par boto3
        self.asked.append(SecretId)
        if SecretId not in self.values:
            raise RuntimeError("AccessDeniedException: not authorized")
        return {"SecretString": self.values[SecretId]}


def _client():
    return FakeSecrets({
        "pam-dev/db-portail": json.dumps(PORTAIL),
        "pam-dev/db-carrieres": json.dumps(CARRIERES),
        "pam-dev/otp-hmac": "chaine-aleatoire-de-quarante-caracteres-xx",
    })


def _environ(**extra) -> dict[str, str]:
    return {
        "DATABASE_SECRET_ID": "pam-dev/db-portail",
        "CARRIERES_DATABASE_SECRET_ID": "pam-dev/db-carrieres",
        "OTP_HMAC_SECRET_ID": "pam-dev/otp-hmac",
        **extra,
    }


def test_ca01_les_trois_secrets_donnent_les_adresses_et_la_cle():
    environ = _environ()

    load_aws_secrets(environ, _client)

    # le mot de passe est encodé dans l'adresse (« / », « @ » et espace)
    assert environ["DATABASE_URL"] == "postgresql+psycopg://pam_portail:mot%2Fde+passe%401@base.secret:5432/portail"
    assert environ["CARRIERES_DATABASE_URL"] == "postgresql+psycopg://pam_app:autre-secret@carrieres.secret:5433/carrieres"
    assert environ["OTP_HMAC_KEY"] == "chaine-aleatoire-de-quarante-caracteres-xx"


def test_ca01_sans_nom_de_secret_rien_n_est_demande():
    environ: dict[str, str] = {}
    calls = []

    load_aws_secrets(environ, lambda: calls.append("client") or _client())

    assert environ == {} and calls == []  # poste local : pas d'appel AWS


def test_ca02_l_adresse_du_serveur_en_variable_l_emporte_sur_le_secret():
    environ = _environ(DATABASE_HOST="pam-dev-portail.abc.us-east-1.rds.amazonaws.com", CARRIERES_DATABASE_HOST="carrieres.vpc")

    load_aws_secrets(environ, _client)

    assert "@pam-dev-portail.abc.us-east-1.rds.amazonaws.com:5432/portail" in environ["DATABASE_URL"]
    assert "@carrieres.vpc:5433/carrieres" in environ["CARRIERES_DATABASE_URL"]


def test_ca02_une_adresse_en_clair_reste_prioritaire():
    environ = _environ(DATABASE_URL="sqlite:///local.db")
    client = _client()

    load_aws_secrets(environ, lambda: client)

    assert environ["DATABASE_URL"] == "sqlite:///local.db"
    assert "pam-dev/db-portail" not in client.asked


@pytest.mark.parametrize(
    ("values", "missing"),
    [
        ({}, "pam-dev/db-portail"),  # refusé ou absent
        ({"pam-dev/db-portail": "pas du json"}, "pam-dev/db-portail"),
        ({"pam-dev/db-portail": json.dumps({**PORTAIL, "password": ""})}, "pam-dev/db-portail"),
    ],
)
def test_ca03_secret_illisible_la_fonction_ne_demarre_pas_sans_rien_reveler(values, missing):
    environ = {"DATABASE_SECRET_ID": "pam-dev/db-portail"}

    with pytest.raises(SecretUnavailable) as error:
        load_aws_secrets(environ, lambda: FakeSecrets(values))

    assert str(error.value) == f"Le secret {missing} est illisible."
    assert "mot/de passe" not in repr(error.value) and "AccessDenied" not in str(error.value)
    # aucune trace de l'erreur d'origine (message d'AWS, ligne JSON) dans la pile affichée
    assert error.value.__cause__ is None
    assert error.value.__suppress_context__ or error.value.__context__ is None
    assert "DATABASE_URL" not in environ


def test_ca03_cle_des_codes_vide_refusee():
    with pytest.raises(SecretUnavailable, match="pam-dev/otp-hmac"):
        load_aws_secrets({"OTP_HMAC_SECRET_ID": "pam-dev/otp-hmac"}, lambda: FakeSecrets({"pam-dev/otp-hmac": "  "}))
