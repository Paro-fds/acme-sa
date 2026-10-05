"""Outil de hash du mot de passe administrateur : écriture dans backend/.env."""

from argon2 import PasswordHasher

from app.tools.hash_password import write_env


def test_creates_env_from_the_example(tmp_path):
    example = tmp_path / ".env.example"
    example.write_text("ACME_DATA_DIR=C:/acme-data\nADMIN_PASSWORD_HASH=\nMAX_UPLOAD_MB=5\n", encoding="utf-8")
    env_file = tmp_path / ".env"
    password_hash = PasswordHasher().hash("Mot-de-passe-long-2026")

    write_env(password_hash, env_file, example)

    text = env_file.read_text(encoding="utf-8")
    assert f"ADMIN_PASSWORD_HASH={password_hash}\n" in text
    assert "ACME_DATA_DIR=C:/acme-data" in text and "MAX_UPLOAD_MB=5" in text
    assert "Mot-de-passe-long-2026" not in text
    assert example.read_text(encoding="utf-8").count("ADMIN_PASSWORD_HASH=\n") == 1


def test_replaces_only_the_hash_line_of_an_existing_env(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("ACME_CSV_PATH=../data/x.csv\nADMIN_PASSWORD_HASH=$argon2id$ancien\n", encoding="utf-8")

    write_env("$argon2id$nouveau", env_file, tmp_path / "absent")

    assert env_file.read_text(encoding="utf-8") == "ACME_CSV_PATH=../data/x.csv\nADMIN_PASSWORD_HASH=$argon2id$nouveau\n"


def test_adds_the_line_when_missing(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("ACME_DATA_DIR=C:/acme-data", encoding="utf-8")

    write_env("$argon2id$h", env_file, tmp_path / "absent")

    assert env_file.read_text(encoding="utf-8") == "ACME_DATA_DIR=C:/acme-data\nADMIN_PASSWORD_HASH=$argon2id$h\n"
