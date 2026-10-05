"""US-24 — Modifier à nouveau après l'envoi : règles du domaine (T-24.1)."""

from datetime import UTC, datetime, timedelta

import pytest

from app.update.domain.errors import NoReopenedUpdate, UpdateAlreadySubmitted, UpdateNotSubmitted
from app.update.domain.update import AdminStatus, EmployeeState, EmployeeUpdate, admin_status, employee_state

FIRST = datetime(2026, 10, 4, 14, 0, tzinfo=UTC)
LATER = FIRST + timedelta(days=2)
REFERENCE = {"telephone_number": "+50937221111", "email_address": "", "address_line_1": "Delmas 33"}


def submitted_update() -> EmployeeUpdate:
    """Envoyée une première fois avec le téléphone +509 3722 2222."""
    update = EmployeeUpdate.start("1001", accepted=True, now=FIRST)
    update.record_changes(REFERENCE, {"telephone_number": "+50937222222"}, FIRST)
    update.submit(True, FIRST)
    return update


def values(changes) -> dict[str, str]:
    return {code: change.new_value for code, change in changes.items()}


def test_submission_keeps_a_copy_of_what_was_sent():
    update = submitted_update()

    assert values(update.submitted_changes) == {"telephone_number": "+50937222222"}
    assert update.submitted_at == FIRST
    assert update.has_submission


# --- CA-02 : réouverture à partir des valeurs envoyées ----------------------------------


def test_ca02_reopen_starts_from_the_sent_values():
    update = submitted_update()

    update.reopen(LATER)

    assert not update.is_submitted
    assert update.is_reopened
    assert values(update.changes) == {"telephone_number": "+50937222222"}
    assert employee_state(update) == EmployeeState.IN_PROGRESS


def test_ca09_cannot_reopen_without_a_submission():
    draft = EmployeeUpdate.start("1001", accepted=True, now=FIRST)

    with pytest.raises(UpdateNotSubmitted):
        draft.reopen(LATER)
    assert not draft.has_submission


def test_cannot_reopen_twice():
    update = submitted_update()
    update.reopen(LATER)

    with pytest.raises(UpdateNotSubmitted):
        update.reopen(LATER)


# --- CA-03 : la copie envoyée ne bouge pas pendant la modification ----------------------


def test_ca03_draft_changes_do_not_touch_the_sent_copy():
    update = submitted_update()
    update.reopen(LATER)

    update.record_changes(REFERENCE, {"telephone_number": "+50937223333", "address_line_1": "12 rue Capois"}, LATER)

    assert values(update.submitted_changes) == {"telephone_number": "+50937222222"}
    assert update.submitted_at == FIRST
    assert admin_status(update) == AdminStatus.UPDATED


# --- CA-04, CA-06 : nouvel envoi ------------------------------------------------------


def test_ca04_new_submission_replaces_the_copy():
    update = submitted_update()
    update.reopen(LATER)
    update.record_changes(REFERENCE, {"telephone_number": "+50937223333"}, LATER)

    update.submit(True, LATER)

    assert update.is_submitted
    assert update.submitted_at == LATER
    change = update.submitted_changes["telephone_number"]
    assert (change.old_value, change.new_value) == ("+50937221111", "+50937223333")


def test_ca06_value_back_to_reference_disappears_from_the_sent_changes():
    update = submitted_update()
    update.reopen(LATER)
    update.record_changes(REFERENCE, {"telephone_number": "+50937221111"}, LATER)

    update.submit(True, LATER)

    assert update.submitted_changes == {}
    # L'employé a bien envoyé : il reste « Mise à jour effectuée », sans changement.
    assert admin_status(update) == AdminStatus.UPDATED


# --- CA-05 : annuler les modifications ------------------------------------------------


def test_ca05_discard_restores_the_sent_version():
    update = submitted_update()
    update.reopen(LATER)
    update.record_changes(REFERENCE, {"telephone_number": "+50937223333"}, LATER)

    update.discard(LATER)

    assert update.is_submitted
    assert update.submitted_at == FIRST
    assert values(update.changes) == {"telephone_number": "+50937222222"}
    assert employee_state(update) == EmployeeState.DONE


def test_ca05_discard_needs_a_reopened_update():
    with pytest.raises(NoReopenedUpdate):
        submitted_update().discard(LATER)
    with pytest.raises(NoReopenedUpdate):
        EmployeeUpdate.start("1001", accepted=True, now=FIRST).discard(LATER)


# --- Garde-fous -------------------------------------------------------------------------


def test_no_answer_no_after_a_submission():
    update = submitted_update()
    update.reopen(LATER)

    with pytest.raises(UpdateAlreadySubmitted):
        update.decide(False, LATER)


def test_submitted_update_still_refuses_writes_until_reopened():
    update = submitted_update()

    with pytest.raises(UpdateAlreadySubmitted):
        update.record_changes(REFERENCE, {"telephone_number": "+50937223333"}, LATER)
