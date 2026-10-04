"""Paramètres de l'application, lus depuis les variables d'environnement ou le fichier .env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    acme_csv_path: Path = PROJECT_DIR / "data" / "vault-employee-list_20261001-1400.csv"
    acme_data_dir: Path = Path("C:/acme-data")
    admin_username: str = "admin"
    admin_password_hash: str = ""
    employee_session_minutes: int = 30
    admin_session_minutes: int = 120
    max_upload_mb: int = 5
    max_documents_per_employee: int = 10
    frontend_dist_dir: Path = PROJECT_DIR / "frontend" / "dist"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{(self.acme_data_dir / 'portail.db').as_posix()}"

    @property
    def documents_dir(self) -> Path:
        return self.acme_data_dir / "documents"
