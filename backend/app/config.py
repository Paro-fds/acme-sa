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
    max_career_entries_per_kind: int = 30
    """V2 (D-10) : éléments au plus par rubrique du parcours professionnel."""
    career_recent_days: int = 7
    """V2 (D-15) : fenêtre « ces derniers jours » de la carte « Parcours enrichis »."""
    frontend_dist_dir: Path = PROJECT_DIR / "frontend" / "dist"
    api_docs: bool = False
    """Documentation interactive de l'API (/api/docs) : désactivée par défaut, le portail pouvant être exposé par un tunnel."""

    @property
    def database_url(self) -> str:
        return f"sqlite:///{(self.acme_data_dir / 'portail.db').as_posix()}"

    @property
    def documents_dir(self) -> Path:
        return self.acme_data_dir / "documents"

    @property
    def career_dir(self) -> Path:
        """Justificatifs du parcours professionnel (V2, AD-V2-04), séparés des documents de la campagne."""
        return self.acme_data_dir / "career"
