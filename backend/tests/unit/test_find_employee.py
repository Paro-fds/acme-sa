"""Règle d'identification (US-01), testée avec des dépôts en mémoire."""

from dataclasses import replace
from datetime import UTC, date, datetime

import pytest

from app.auth.application.identity import Identity, find_employee
from app.auth.domain.errors import IdentityAmbiguous, IdentityNotRecognized
from app.employee.domain.employee import Employee
from app.update.domain.update import EmployeeUpdate

NOW = datetime(2026, 10, 4, tzinfo=UTC)

JEAN = Employee(
    id="1", employee_code="AC-1", last_name="JOSEPH", first_name="Jean", birth_date=date(1996, 3, 15),
    gender="M", agency_code="PV", department="", position="", grade="", level="", contract_nature="CDI",
    hire_date=None, telephone_number="", email_address="", address_line_1="",
)


class InMemoryEmployees:
    def __init__(self, *employees: Employee) -> None:
        self._employees = {employee.id: employee for employee in employees}

    def get(self, employee_id):
        return self._employees.get(employee_id)

    def list_all(self):
        return list(self._employees.values())


class InMemoryUpdates:
    def __init__(self, *updates: EmployeeUpdate) -> None:
        self._updates = {update.employee_id: update for update in updates}

    def get_for_employee(self, employee_id):
        return self._updates.get(employee_id)

    def save(self, update):
        self._updates[update.employee_id] = update

    def list_all(self):
        return list(self._updates.values())


def renamed(employee: Employee, new_last_name: str, submit: bool) -> EmployeeUpdate:
    update = EmployeeUpdate.start(employee.id, accepted=True, now=NOW)
    update.record_changes({"last_name": employee.last_name}, {"last_name": new_last_name}, NOW)
    if submit:
        update.submit(confirmed=True, now=NOW)
    return update


def test_matches_reference_identity_with_normalization():
    found = find_employee(InMemoryEmployees(JEAN), InMemoryUpdates(), Identity(" joseph ", "JEAN", date(1996, 3, 15)))

    assert found == JEAN


def test_unknown_identity_is_not_recognized():
    with pytest.raises(IdentityNotRecognized):
        find_employee(InMemoryEmployees(JEAN), InMemoryUpdates(), Identity("JOSEPH", "Jean", date(1996, 3, 16)))


def test_two_matching_employees_are_ambiguous():
    twin = replace(JEAN, id="2", employee_code="AC-2")

    with pytest.raises(IdentityAmbiguous):
        find_employee(InMemoryEmployees(JEAN, twin), InMemoryUpdates(), Identity("JOSEPH", "Jean", date(1996, 3, 15)))


def test_submitted_new_name_and_old_name_both_match():
    employees = InMemoryEmployees(JEAN)
    updates = InMemoryUpdates(renamed(JEAN, "JOSEPH-PAUL", submit=True))

    assert find_employee(employees, updates, Identity("Joseph-Paul", "Jean", date(1996, 3, 15))) == JEAN
    assert find_employee(employees, updates, Identity("JOSEPH", "Jean", date(1996, 3, 15))) == JEAN


def test_draft_new_name_does_not_match():
    updates = InMemoryUpdates(renamed(JEAN, "JOSEPH-PAUL", submit=False))

    with pytest.raises(IdentityNotRecognized):
        find_employee(InMemoryEmployees(JEAN), updates, Identity("Joseph-Paul", "Jean", date(1996, 3, 15)))
