"""US-001 : socle déployable (PostgreSQL, migrations Alembic, stockage distant, configuration par l'environnement)."""

import csv
import io
import json
import os
from pathlib import Path

import botocore.session
import httpx
import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from botocore.response import StreamingBody
from botocore.stub import Stubber
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from app.config import DEMO_CSV, Settings, normalize_database_url
from app.container import Container
from app.document.infrastructure.local_file_storage import LocalFileStorage
from app.document.infrastructure.remote_file_storage import S3FileStorage, SupabaseFileStorage
from app.main import create_app
from app.shared.infrastructure.database import Base
from tests.employees import SECRET_MARKER

BACKEND_DIR = Path(__file__).resolve().parent.parent


def migrate(database_url: str) -> None:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = database_url
    command.upgrade(config, "head")


def schema_differences(database_url: str) -> list:
    engine = create_engine(database_url)
    with engine.connect() as connection:
        differences = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    engine.dispose()
    return differences


# --- CA-07 : schéma créé par les migrations Alembic ----------------------------------------


def test_ca07_les_migrations_creent_exactement_le_schema_de_l_application(tmp_path: Path):
    url = f"sqlite:///{(tmp_path / 'portail.db').as_posix()}"

    migrate(url)

    assert schema_differences(url) == []


def test_ca07_deploye_l_application_demarre_sur_le_schema_des_migrations_sans_le_creer(tmp_path: Path):
    url = f"sqlite:///{(tmp_path / 'portail.db').as_posix()}"
    migrate(url)
    settings = Settings(
        _env_file=None,
        database_url=url,
        auto_create_schema=False,
        app_env="demo",
        acme_data_dir=tmp_path / "data",
        frontend_dist_dir=tmp_path / "dist",
    )

    app = create_app(settings)
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        identity = {"last_name": "JOSEPH", "first_name": "Jean", "birth_date": "1996-03-15"}
        assert client.post("/api/auth/login", json={**identity, "password": "Bonjour-2026"}).status_code == 401
    app.state.container.close()


# --- CA-03 : tout passe par des variables d'environnement ------------------------------------


def test_ca03_la_configuration_vient_des_variables_d_environnement(monkeypatch):
    monkeypatch.setenv("APP_ENV", "demo")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:motdepasse@db.exemple.test:5432/postgres")
    monkeypatch.setenv("STORAGE_BACKEND", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://projet.exemple.test")
    monkeypatch.setenv("S3_BUCKET", "certificats")

    settings = Settings(_env_file=None)

    assert settings.app_env == "demo"
    assert settings.database_url == "postgresql+psycopg://user:motdepasse@db.exemple.test:5432/postgres"
    assert settings.storage_backend == "supabase"
    assert settings.supabase_url == "https://projet.exemple.test"
    assert settings.s3_bucket == "certificats"


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("postgres://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgresql://u:p@h:6543/db", "postgresql+psycopg://u:p@h:6543/db"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite:///C:/acme/portail.db", "sqlite:///C:/acme/portail.db"),
    ],
)
def test_ca03_les_chaines_de_connexion_de_supabase_et_rds_sont_acceptees_telles_quelles(given, expected):
    assert normalize_database_url(given) == expected


def test_ca03_sans_database_url_la_base_reste_sqlite_sur_le_poste(tmp_path: Path):
    settings = Settings(_env_file=None, acme_data_dir=tmp_path)

    assert settings.database_url == f"sqlite:///{(tmp_path / 'portail.db').as_posix()}"


def test_ca03_aucun_secret_ni_adresse_de_service_dans_le_code():
    sources = list((BACKEND_DIR / "app").rglob("*.py")) + [BACKEND_DIR / "alembic.ini", BACKEND_DIR / "Dockerfile"]
    for path in sources:
        text = path.read_text(encoding="utf-8")
        for forbidden in (".supabase.co", ".onrender.com", "amazonaws.com", "eyJhbGci", "sb_secret_"):
            assert forbidden not in text, f"{forbidden} dans {path.name}"


# --- CA-05 : jeu fictif imposé hors production ----------------------------------------------


def test_ca05_en_demonstration_le_jeu_fictif_est_impose_meme_si_un_autre_csv_est_configure(tmp_path: Path):
    settings = Settings(_env_file=None, app_env="demo", acme_csv_path=tmp_path / "vrai-fichier.csv")

    assert settings.acme_csv_path == DEMO_CSV


def test_ca05_le_jeu_de_demonstration_ne_contient_que_des_donnees_fictives():
    with DEMO_CSV.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    assert rows
    for row in rows:
        assert row["email_address"] == "" or row["email_address"].endswith("@exemple.test")
        for column in ("id_card_code", "primary_reference", "layoff"):
            assert row[column].startswith(SECRET_MARKER)


# --- CA-02, CA-06 : fichiers dans un compartiment privé, derrière le port FileStorage -------


def supabase(handler) -> SupabaseFileStorage:
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return SupabaseFileStorage("https://projet.exemple.test/", "cle-service", "certificats", client=client)


def test_ca02_supabase_depose_lit_et_supprime_dans_le_compartiment_prive():
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.method == "GET":
            return httpx.Response(200, content=b"%PDF")
        return httpx.Response(200, json={})

    storage = supabase(handler)
    storage.save("1001/ab12.pdf", b"%PDF")
    assert storage.open("1001/ab12.pdf") == b"%PDF"
    storage.delete("1001/ab12.pdf")

    save, read, remove = calls
    object_url = "https://projet.exemple.test/storage/v1/object/certificats/1001/ab12.pdf"
    assert (save.method, str(save.url)) == ("POST", object_url)
    assert save.headers["authorization"] == "Bearer cle-service"
    assert save.headers["x-upsert"] == "true"
    assert (read.method, str(read.url)) == ("GET", object_url)
    assert (remove.method, str(remove.url)) == ("DELETE", "https://projet.exemple.test/storage/v1/object/certificats")
    assert json.loads(remove.content) == {"prefixes": ["1001/ab12.pdf"]}


def test_ca02_supabase_un_fichier_absent_est_signale_comme_tel():
    storage = supabase(lambda request: httpx.Response(400, json={"error": "not_found"}))

    with pytest.raises(FileNotFoundError):
        storage.open("1001/absent.pdf")


@pytest.mark.parametrize("key", ["", "/1001/a.pdf", "1001/../1002/a.pdf"])
def test_ca02_une_cle_qui_sortirait_du_dossier_est_refusee(key):
    storage = supabase(lambda request: httpx.Response(200))

    with pytest.raises(ValueError):
        storage.save(key, b"x")


def test_ca02_s3_depose_lit_et_supprime_avec_l_interface_s3():
    client = botocore.session.get_session().create_client(
        "s3", region_name="us-east-1", aws_access_key_id="k", aws_secret_access_key="s"
    )
    stub = Stubber(client)
    key = {"Bucket": "certificats", "Key": "1001/ab12.pdf"}
    stub.add_response("put_object", {}, {**key, "Body": b"%PDF"})
    stub.add_response("get_object", {"Body": StreamingBody(io.BytesIO(b"%PDF"), 4)}, key)
    stub.add_response("delete_object", {}, key)
    stub.add_client_error("get_object", service_error_code="NoSuchKey", http_status_code=404)
    storage = S3FileStorage("certificats", client)

    with stub:
        storage.save("1001/ab12.pdf", b"%PDF")
        assert storage.open("1001/ab12.pdf") == b"%PDF"
        storage.delete("1001/ab12.pdf")
        with pytest.raises(FileNotFoundError):
            storage.open("1001/absent.pdf")


@pytest.mark.parametrize(
    ("backend", "expected"),
    [("local", LocalFileStorage), ("supabase", SupabaseFileStorage), ("s3", S3FileStorage)],
)
def test_ca08_l_adaptateur_de_stockage_se_choisit_par_la_configuration(tmp_path: Path, backend, expected):
    settings = Settings(
        _env_file=None,
        app_env="demo",
        acme_data_dir=tmp_path,
        storage_backend=backend,
        supabase_url="https://projet.exemple.test",
        supabase_service_role_key="cle",
        s3_bucket="certificats",
    )

    container = Container(settings)
    assert isinstance(container.file_storage, expected)
    container.close()


# --- CA-08 : même code sur une autre base PostgreSQL ------------------------------------------

POSTGRES_URL = os.environ.get("TEST_POSTGRES_URL")


@pytest.mark.skipif(not POSTGRES_URL, reason="TEST_POSTGRES_URL non défini (base PostgreSQL de répétition)")
def test_ca08_les_migrations_passent_sur_postgresql():
    url = normalize_database_url(POSTGRES_URL)
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.exec_driver_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    engine.dispose()

    migrate(url)

    assert schema_differences(url) == []
