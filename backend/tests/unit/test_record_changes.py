"""US-09 — Calcul des changements dans le brouillon (T-09.2)."""

from datetime import UTC, datetime, timedelta

import pytest

from app.update.domain.errors import InvalidField
from app.update.domain.update import EmployeeUpdate

NOW = datetime(2026, 10, 4, 14, 32, tzinfo=UTC)
REFERENCE = {
    "last_name": "JOSEPH",
    "first_name": "Jean",
    "telephone_number": "+50937221111",
    "email_address": "",
    "address_line_1": "12 rue Capois, Port-au-Prince",
}


def accepted_update() -> EmployeeUpdate:
    return EmployeeUpdate.start("1001", accepted=True, now=NOW)


def test_ca02_several_changes_are_recorded_with_old_and_new_values():
    update = accepted_update()

    update.record_changes(
        REFERENCE,
        {**REFERENCE, "telephone_number": "+509 3722 2222", "address_line_1": "5 rue Pavée, Jacmel"},
        NOW,
    )

    assert {code: (c.old_value, c.new_value) for code, c in update.changes.items()} == {
        "telephone_number": ("+50937221111", "+509 3722 2222"),
        "address_line_1": ("12 rue Capois, Port-au-Prince", "5 rue Pavée, Jacmel"),
    }


def test_unchanged_values_sent_with_the_form_are_not_changes():
    update = accepted_update()

    update.record_changes(REFERENCE, REFERENCE, NOW)

    assert update.changes == {}


def test_ca04_value_back_to_the_original_removes_the_change():
    update = accepted_update()
    update.record_changes(REFERENCE, {"telephone_number": "+509 3722 2222"}, NOW)

    update.record_changes(REFERENCE, {"telephone_number": "+50937221111"}, NOW + timedelta(minutes=1))

    assert update.changes == {}


def test_ca04_original_value_with_extra_spaces_is_not_a_change():
    update = accepted_update()

    update.record_changes(REFERENCE, {"address_line_1": "  12 rue  Capois,   Port-au-Prince "}, NOW)

    assert update.changes == {}


def test_ca08_empty_original_value_is_kept_empty():
    update = accepted_update()

    update.record_changes(REFERENCE, {"email_address": "jean.joseph@exemple.test"}, NOW)

    change = update.changes["email_address"]
    assert (change.old_value, change.new_value) == ("", "jean.joseph@exemple.test")


def test_ca05_one_invalid_value_saves_nothing():
    update = accepted_update()

    with pytest.raises(InvalidField):
        update.record_changes(REFERENCE, {"telephone_number": "+509 3722 2222", "email_address": "jean@"}, NOW)

    assert update.changes == {}
