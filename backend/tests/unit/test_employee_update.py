"""Règles métier de la mise à jour, testées sans base ni fichier."""

from datetime import UTC, datetime, timedelta

import pytest

from app.update.domain.errors import (
    ConfirmationRequired,
    FieldNotEditable,
    InvalidField,
    UpdateAlreadySubmitted,
    UpdateNotStarted,
)
from app.update.domain.update import AdminStatus, EmployeeState, EmployeeUpdate, admin_status, employee_state

NOW = datetime(2026, 10, 4, 14, 32, tzinfo=UTC)
REFERENCE = {"telephone_number": "+50937221111", "email_address": "", "address_line_1": "12 rue Capois"}


def accepted_update() -> EmployeeUpdate:
    return EmployeeUpdate.start("1001", accepted=True, now=NOW)


def test_change_records_old_and_new_value():
    update = accepted_update()

    update.record_changes(REFERENCE, {"telephone_number": " +509 3722 2222 "}, NOW)

    change = update.changes["telephone_number"]
    assert (change.old_value, change.new_value) == ("+50937221111", "+509 3722 2222")


def test_value_back_to_reference_is_no_longer_a_change():
    update = accepted_update()
    update.record_changes(REFERENCE, {"telephone_number": "+50937222222"}, NOW)

    update.record_changes(REFERENCE, {"telephone_number": "+50937221111"}, NOW)

    assert update.changes == {}


def test_unchanged_value_keeps_its_original_change_date():
    update = accepted_update()
    update.record_changes(REFERENCE, {"telephone_number": "+50937222222"}, NOW)

    update.record_changes(REFERENCE, {"telephone_number": "+50937222222"}, NOW + timedelta(hours=1))

    assert update.changes["telephone_number"].changed_at == NOW


def test_one_invalid_value_saves_nothing():
    update = accepted_update()

    with pytest.raises(InvalidField) as error:
        update.record_changes(REFERENCE, {"address_line_1": "5 rue Pavée", "telephone_number": "12ab"}, NOW)

    assert error.value.field == "telephone_number"
    assert update.changes == {}


def test_required_field_cannot_be_emptied():
    with pytest.raises(InvalidField, match="obligatoire"):
        accepted_update().record_changes(REFERENCE, {"telephone_number": "  "}, NOW)


def test_unknown_field_is_not_editable():
    with pytest.raises(FieldNotEditable):
        accepted_update().record_changes(REFERENCE, {"position": "Directeur"}, NOW)


def test_changes_require_a_yes():
    update = EmployeeUpdate.start("1001", accepted=False, now=NOW)

    with pytest.raises(UpdateNotStarted):
        update.record_changes(REFERENCE, {"telephone_number": "+50937222222"}, NOW)


def test_submission_requires_confirmation():
    with pytest.raises(ConfirmationRequired):
        accepted_update().submit(confirmed=False, now=NOW)


def test_nothing_can_change_after_submission():
    update = accepted_update()
    update.submit(confirmed=True, now=NOW)

    with pytest.raises(UpdateAlreadySubmitted):
        update.record_changes(REFERENCE, {"telephone_number": "+50937222222"}, NOW)
    with pytest.raises(UpdateAlreadySubmitted):
        update.decide(False, NOW)
    with pytest.raises(UpdateAlreadySubmitted):
        update.submit(confirmed=True, now=NOW)


@pytest.mark.parametrize(
    ("accepted", "submit", "expected_admin", "expected_employee"),
    [
        (False, False, AdminStatus.NOT_UPDATED, EmployeeState.NOT_DONE),
        (True, False, AdminStatus.NOT_UPDATED, EmployeeState.IN_PROGRESS),
        (True, True, AdminStatus.UPDATED, EmployeeState.DONE),
    ],
)
def test_statuses(accepted, submit, expected_admin, expected_employee):
    update = EmployeeUpdate.start("1001", accepted=accepted, now=NOW)
    if submit:
        update.submit(confirmed=True, now=NOW)

    assert admin_status(update) == expected_admin
    assert employee_state(update) == expected_employee


def test_statuses_without_update():
    assert admin_status(None) == AdminStatus.NOT_UPDATED
    assert employee_state(None) == EmployeeState.NOT_DONE
