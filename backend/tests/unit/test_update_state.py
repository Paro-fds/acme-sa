"""US-06 — Calcul de l'état de la mise à jour côté employé (T-06.1)."""

from datetime import UTC, datetime, timedelta

from app.update.domain.update import EmployeeState, EmployeeUpdate, employee_state

NOW = datetime(2026, 10, 4, 14, 32, tzinfo=UTC)


def test_ca01_no_update_is_not_done():
    assert employee_state(None) == EmployeeState.NOT_DONE


def test_ca02_yes_without_submission_is_in_progress():
    update = EmployeeUpdate.start("1001", accepted=True, now=NOW)

    assert employee_state(update) == EmployeeState.IN_PROGRESS


def test_ca02_draft_with_changes_is_in_progress():
    update = EmployeeUpdate.start("1001", accepted=True, now=NOW)
    update.record_changes({"telephone_number": "+50937221111"}, {"telephone_number": "+509 3722 2222"}, NOW)

    assert employee_state(update) == EmployeeState.IN_PROGRESS


def test_ca03_submitted_is_done():
    update = EmployeeUpdate.start("1001", accepted=True, now=NOW)
    update.submit(confirmed=True, now=NOW + timedelta(minutes=38))

    assert employee_state(update) == EmployeeState.DONE


def test_ca04_no_answer_is_not_done():
    update = EmployeeUpdate.start("1001", accepted=False, now=NOW)

    assert employee_state(update) == EmployeeState.NOT_DONE


def test_ca04_yes_then_no_is_not_done():
    update = EmployeeUpdate.start("1001", accepted=True, now=NOW)
    update.decide(False, NOW + timedelta(minutes=1))

    assert employee_state(update) == EmployeeState.NOT_DONE
