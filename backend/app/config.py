"""Paramètres de l'application, lus depuis les variables d'environnement ou le fichier .env.

US-001 CA-03 : aucune adresse ni aucun secret dans le code ; les mêmes noms de variables
servent en local, sur les services gratuits (démonstrateur) et sur AWS.
"""

from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
DEMO_CSV = BACKEND_DIR / "demo" / "employes-fictifs.csv"
"""US-001 CA-05 : seul jeu d'employés chargé hors production (données fictives)."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["local", "demo", "recette", "production"] = "local"
    """`demo` : bandeau « Démonstration · données fictives », jeu fictif imposé, codes de démonstration visibles."""
    acme_csv_path: Path = PROJECT_DIR / "data" / "vault-employee-list_20261001-1400.csv"
    acme_data_dir: Path = Path("C:/acme-data")
    database_url: str = ""
    """`DATABASE_URL` : PostgreSQL (Supabase, puis RDS) ; vide = SQLite dans `ACME_DATA_DIR` (poste du développeur, tests)."""
    auto_create_schema: bool = True
    """Création directe du schéma (SQLite local, tests). Déployé : `false`, le schéma vient des migrations Alembic."""
    storage_backend: Literal["local", "supabase", "s3"] = "local"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    s3_endpoint_url: str = ""
    """Vide sur AWS (S3 par défaut) ; adresse S3 de Supabase Storage sur le démonstrateur."""
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    admin_username: str = "admin"
    admin_password_hash: str = ""
    employee_session_minutes: int = 30
    admin_session_minutes: int = 120
    admin_mfa_required: bool = True
    """US-102 : double authentification des comptes RH ; toujours exigée en recette et en production."""
    rh_allowed_networks: str = ""
    """US-102 CA-06 : réseaux des bureaux (CIDR séparés par des virgules) ; vide = pas de restriction (démonstrateur)."""
    max_upload_mb: int = 5
    max_documents_per_employee: int = 10
    max_career_entries_per_kind: int = 30
    """V2 (D-10) : éléments au plus par rubrique du parcours professionnel."""
    career_recent_days: int = 7
    """V2 (D-15) : fenêtre « ces derniers jours » de la carte « Parcours enrichis »."""
    frontend_dist_dir: Path = PROJECT_DIR / "frontend" / "dist"
    api_docs: bool = False
    """Documentation interactive de l'API (/api/docs) : désactivée par défaut, le portail pouvant être exposé par un tunnel."""

    @model_validator(mode="after")
    def _derive(self) -> "Settings":
        if self.app_env in ("recette", "production"):
            self.admin_mfa_required = True
        if self.app_env == "demo":
            # CA-05 : aucun vrai CSV ne peut être chargé sur le démonstrateur, quelle que soit la configuration.
            self.acme_csv_path = DEMO_CSV
        if not self.database_url:
            self.database_url = f"sqlite:///{(self.acme_data_dir / 'portail.db').as_posix()}"
        self.database_url = normalize_database_url(self.database_url)
        return self

    @property
    def is_demo(self) -> bool:
        return self.app_env == "demo"

    @property
    def shows_demo_codes(self) -> bool:
        """US-102 : hors recette et production, les codes de vérification s'affichent à l'écran au lieu de partir."""
        return self.app_env in ("local", "demo")

    @property
    def documents_dir(self) -> Path:
        return self.acme_data_dir / "documents"

    @property
    def career_dir(self) -> Path:
        """Justificatifs du parcours professionnel (V2, AD-V2-04), séparés des documents de la campagne."""
        return self.acme_data_dir / "career"


def normalize_database_url(url: str) -> str:
    """Les chaînes de Supabase et RDS commencent par `postgres://` ou `postgresql://` : on choisit le pilote psycopg 3."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url
