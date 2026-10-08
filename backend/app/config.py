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
    """`demo` et `recette` : jeu fictif imposé (US-001 CA-05) ; `local` : poste du développeur et tests."""
    acme_csv_path: Path = PROJECT_DIR / "data" / "vault-employee-list_20261001-1400.csv"
    acme_data_dir: Path = Path("C:/acme-data")
    database_url: str = ""
    """`DATABASE_URL` : PostgreSQL (Supabase, puis RDS) ; vide = SQLite dans `ACME_DATA_DIR` (poste du développeur, tests)."""
    auto_create_schema: bool = True
    """Création directe du schéma (SQLite local, tests). Déployé : `false`, le schéma vient des migrations Alembic."""
    storage_backend: Literal["local", "s3"] = "local"
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
    mfa_methods: str = "TOTP,EMAIL,WHATSAPP"
    """US-102 : méthodes de double authentification proposées. Tant que le service d'envoi des codes n'est pas
    choisi avec la DIT (D-41), les environnements en ligne n'ouvrent que `TOTP`."""
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
        if self.app_env in ("demo", "recette"):
            # US-001 CA-05 : en ligne hors production, aucun vrai CSV ne peut être chargé, quelle que soit la configuration.
            self.acme_csv_path = DEMO_CSV
        if not self.database_url and self.app_env != "local":
            # US-001 : un conteneur déployé perd son disque à chaque redémarrage ; jamais de SQLite en ligne.
            raise ValueError(f"DATABASE_URL est obligatoire avec APP_ENV={self.app_env} (base PostgreSQL).")
        if not self.database_url:
            self.database_url = f"sqlite:///{(self.acme_data_dir / 'portail.db').as_posix()}"
        self.database_url = normalize_database_url(self.database_url)
        return self

    @property
    def is_demo(self) -> bool:
        return self.app_env == "demo"

    @property
    def shows_local_codes(self) -> bool:
        """US-102 : sur le poste du développeur seulement (et dans les tests), aucun code ne part ;
        l'API le renvoie pour qu'il s'affiche à l'écran."""
        return self.app_env == "local"

    @property
    def enabled_mfa_methods(self) -> list[str]:
        return [part.strip().upper() for part in self.mfa_methods.split(",") if part.strip()]

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
