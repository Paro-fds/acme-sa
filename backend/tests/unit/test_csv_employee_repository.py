"""T-01.11 : lecture du CSV — actifs seulement, dates MM/JJ/AAAA, colonnes exclues absentes."""

from dataclasses import asdict
from datetime import date

from app.employee.infrastructure.csv_employee_repository import CsvEmployeeRepository
from tests.conftest import TEST_CSV
from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_I, SECRET_MARKER


def test_only_active_employees_are_loaded():
    repository = CsvEmployeeRepository(TEST_CSV)

    assert {employee.id for employee in repository.list_all()} == {e.id for e in ACTIVE_EMPLOYEES}
    assert repository.get(EMP_I.id) is None


def test_dates_are_read_as_month_day_year():
    employee = CsvEmployeeRepository(TEST_CSV).get(EMP_A.id)

    assert employee.birth_date == date(1996, 3, 15)
    assert employee.hire_date == date(2018, 9, 3)


def test_excluded_columns_are_never_loaded():
    for employee in CsvEmployeeRepository(TEST_CSV).list_all():
        assert SECRET_MARKER not in repr(asdict(employee))
