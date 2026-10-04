"""Fixtures communes à toutes les stories (docs/epics/README.md).

Chaque test démarre avec une base SQLite vide, un dossier de documents vide
et le CSV fictif `fixtures/employees_test.csv` : aucun test ne dépend d'un autre.
"""

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from argon2 import PasswordHasher
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.auth.domain.model import Account, SubjectType
from app.config import Settings
from app.main import create_app
from app.update.domain.update import EmployeeUpdate
from tests.employees import ADMIN_PASSWORD, ADMIN_USERNAME, TestEmployee
from tests.fake_clock import FakeClock

FIXTURES_DIR = Path(__file__).parent / "fixtures"
TEST_CSV = FIXTURES_DIR / "employees_test.csv"


@pytest.fixture(scope="session")
def admin_password_hash() -> str:
    return PasswordHasher().hash(ADMIN_PASSWORD)


@pytest.fixture
def settings(tmp_path: Path, admin_password_hash: str) -> Settings:
    return Settings(
        _env_file=None,
        acme_csv_path=TEST_CSV,
        acme_data_dir=tmp_path / "acme-data",
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


@pytest.fixture
def admin_client(app: FastAPI, container) -> Iterator[TestClient]:
    token = container.session_service().open(SubjectType.ADMIN, "admin")
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
