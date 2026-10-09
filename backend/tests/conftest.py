"""Fixtures communes à toutes les stories (docs/03-plan-implementation.md §4.2).

Chaque test démarre avec une base SQLite vide, un dossier de documents vide
et le CSV fictif `fixtures/employees_test.csv` : aucun test ne dépend d'un autre.
"""

import os
from collections.abc import Callable, Iterator
from datetime import UTC, datetime
from pathlib import Path

import pyotp
import pytest
from argon2 import PasswordHasher
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.domain.model import Account, SubjectType
from app.career.domain.career_entry import CareerEntry
from app.career.domain.entry_kinds import EntryKind, SkillLevel
from app.config import Settings, normalize_database_url
from app.main import create_app
from app.update.domain.update import EmployeeUpdate
from tests.career import make_entry
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, EMP_A, EMP_B, EMP_I, TestEmployee
from tests.fake_clock import FakeClock

FIXTURES_DIR = Path(__file__).parent / "fixtures"
TEST_CSV = FIXTURES_DIR / "employees_test.csv"
CAREER_NOW = datetime(2026, 10, 15, 12, 0, tzinfo=UTC)
"""Heure de référence des tests du parcours (mois courant 2026-10)."""


@pytest.fixture(scope="session")
def admin_password_hash() -> str:
    return PasswordHasher().hash(ADMIN_PASSWORD)


POSTGRES_URL = os.environ.get("TEST_POSTGRES_URL", "")
"""US-001 CA-08 : avec cette variable, toute la suite tourne sur une base PostgreSQL de répétition (vidée à chaque test)."""


def _empty_postgres(url: str) -> str:
    url = normalize_database_url(url)
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.exec_driver_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    engine.dispose()
    return url


@pytest.fixture
def settings(tmp_path: Path, admin_password_hash: str) -> Settings:
    return Settings(
        _env_file=None,
        acme_csv_path=TEST_CSV,
        acme_data_dir=tmp_path / "acme-data",
        database_url=_empty_postgres(POSTGRES_URL) if POSTGRES_URL else "",
        frontend_dist_dir=tmp_path / "no-frontend",
        admin_username=ADMIN_USERNAME,
        admin_password_hash=admin_password_hash,
    )


@pytest.fixture
def app(settings: Settings) -> Iterator[FastAPI]:
    application = create_app(settings)
    yield application
    application.state.container.close()


@pytest.fixture
def container(app: FastAPI):
    return app.state.container


@pytest.fixture
def clock(container) -> FakeClock:
    """Remplace l'horloge de l'application par une horloge que le test fait avancer."""
    fake = FakeClock()
    container.clock = fake
    return fake


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def account(container) -> Callable[[TestEmployee, str], None]:
    """Crée le compte d'un employé avec ce mot de passe."""

    def create(employee: TestEmployee, password: str = "Bonjour-2026") -> None:
        container.accounts.save(Account(employee.id, container.password_hasher.hash(password)))

    return create


@pytest.fixture
def employee_client(app: FastAPI, container) -> Iterator[Callable[[TestEmployee], TestClient]]:
    """Client déjà connecté en tant que l'employé (session ouverte directement, sans passer par l'API)."""
    clients: list[TestClient] = []

    def connect(employee: TestEmployee) -> TestClient:
        token = container.session_service().open(SubjectType.EMPLOYEE, employee.id)
        test_client = TestClient(app, cookies={SESSION_COOKIE: token})
        clients.append(test_client)
        return test_client

    yield connect
    for test_client in clients:
        test_client.close()


RH_LOGIN = "/api/admin/auth/login"


def rh_login(client: TestClient, username: str, password: str):
    """Connexion RH complète par l'API (US-102) : mot de passe, puis code de l'application d'authentification.

    À la première connexion du compte, l'application est enregistrée. Renvoie la réponse de l'étape qui
    échoue, ou celle du code (204, cookie de la session RH) quand tout réussit.
    """
    response = client.post(RH_LOGIN, json={"username": username, "password": password})
    if response.status_code != 202:
        return response
    container = client.app.state.container
    if response.json()["mfa"]["enrolled"]:
        secret = container.admin_accounts.find_by_username(username).mfa_secret
        return client.post("/api/admin/auth/mfa/verify", json={"code": pyotp.TOTP(secret).at(container.clock.now())})
    secret = client.post("/api/admin/auth/mfa/setup", json={"method": "TOTP"}).json()["totp"]["secret"]
    code = pyotp.TOTP(secret).at(container.clock.now())
    return client.post("/api/admin/auth/mfa/setup/confirm", json={"code": code})


def admin_session(container) -> str:
    """Jeton d'une session ouverte pour le compte admin de test (importé de la configuration, US-23)."""
    admin = container.admin_accounts.find_by_username(ADMIN_USERNAME)
    return container.session_service().open(SubjectType.ADMIN, admin.id)


@pytest.fixture
def admin_client(app: FastAPI, container) -> Iterator[TestClient]:
    token = admin_session(container)
    with TestClient(app, cookies={SESSION_COOKIE: token}) as test_client:
        yield test_client


@pytest.fixture
def draft(container) -> Callable[[TestEmployee, dict[str, str]], EmployeeUpdate]:
    """Crée une mise à jour en brouillon (réponse « Oui ») avec ces changements."""

    def create(employee: TestEmployee, changes: dict[str, str] | None = None) -> EmployeeUpdate:
        container.record_decision().execute(employee.id, True)
        if changes:
            container.save_draft().execute(employee.id, changes)
        return container.updates.get_for_employee(employee.id)

    return create


@pytest.fixture
def submitted(container, draft) -> Callable[[TestEmployee, dict[str, str]], EmployeeUpdate]:
    """Crée une mise à jour soumise avec ces changements."""

    def create(employee: TestEmployee, changes: dict[str, str] | None = None) -> EmployeeUpdate:
        draft(employee, changes)
        container.submit_update().execute(employee.id, True)
        return container.updates.get_for_employee(employee.id)

    return create


# --- Hérité de la V2 : parcours professionnel (D-44) --------------------------------


@pytest.fixture
def frozen_clock(container) -> Callable[[datetime], FakeClock]:
    """Fixe l'horloge de l'application (ex. 2026-10-15 : mois courant 2026-10)."""

    def freeze(moment: datetime = CAREER_NOW) -> FakeClock:
        fake = FakeClock(moment)
        container.clock = fake
        return fake

    return freeze


@pytest.fixture
def career_entry(container) -> Callable[..., CareerEntry]:
    """Crée un élément du parcours de l'employé (valeurs par défaut de sa rubrique) et met à jour `career_profile`."""

    def create(employee: TestEmployee, kind: EntryKind, **fields) -> CareerEntry:
        entry = make_entry(employee.id, kind, **fields)
        container.careers.add(entry, changed_at=entry.updated_at)
        return entry

    return create


@pytest.fixture
def career_reference(career_entry) -> dict[str, list[CareerEntry]]:
    """Parcours de référence P-A, P-B, P-I (EMP-I est inactif). Le justificatif de P-A arrive avec US-29."""
    return {
        "P-A": [
            career_entry(EMP_A, EntryKind.SKILL, title="Analyse de crédit", skill_level=SkillLevel.EXPERT),
            career_entry(EMP_A, EntryKind.QUALIFICATION),
            career_entry(EMP_A, EntryKind.EXPERIENCE),
        ],
        "P-B": [
            career_entry(EMP_B, EntryKind.SKILL, title="Anglais", skill_level=SkillLevel.GOOD),
            career_entry(EMP_B, EntryKind.TRAINING),
        ],
        "P-I": [career_entry(EMP_I, EntryKind.SKILL, title="Analyse de crédit", skill_level=SkillLevel.EXPERT)],
    }


# --- Lot 1 : profil complet (US-204, US-301) --------------------------------------------------------

COMPLETE_COORDINATES = {"telephone": "3712 3456", "address": "12 rue Capois, Port-au-Prince", "email": "", "no_email": True}
COMPLETE_CONTACT = {
    "contact_name": "Jean Baptiste Pierre",
    "contact_relationship": "SIBLING",
    "contact_telephone": "4812 8901",
    "education_level": "LICENCE",
}


def complete_profile(client: TestClient) -> None:
    """Remplit les 8 éléments de RG-01 par l'API : consentement, coordonnées, contact, niveau, trois confirmations."""
    assert client.post("/api/me/dossier/consent", json={"information_notice": True, "whatsapp": False}).status_code == 200
    assert client.put("/api/me/dossier/coordinates", json=COMPLETE_COORDINATES).status_code == 200
    assert client.put("/api/me/dossier/contact-and-education", json=COMPLETE_CONTACT).status_code == 200
    for key in ("agency_confirmed", "position_confirmed", "hire_date_confirmed"):
        assert client.post(f"/api/me/dossier/hr-information/{key}/confirm").status_code == 200
