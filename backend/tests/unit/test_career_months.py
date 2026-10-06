"""Mois du parcours (D-07, AD-V2-06) : « AAAA-MM » dans l'API, comparables entre eux."""

from datetime import date

import pytest

from app.career.domain.errors import InvalidCareerField
from app.career.domain.months import Month


def test_parse_and_format():
    month = Month.parse("2021-06", field="start_month")

    assert (month.year, month.month, str(month)) == (2021, 6, "2021-06")
    assert month.first_day() == date(2021, 6, 1)
    assert Month.of(date(2026, 10, 15)) == Month(2026, 10)


def test_months_are_ordered():
    assert Month(2019, 12) < Month(2020, 1) < Month(2020, 2)


@pytest.mark.parametrize("text", ["2021-13", "2021-00", "2021-6", "21-06", "juin 2021", "", "2021-06-01", "1899-12"])
def test_invalid_months_are_refused_with_the_field(text):
    with pytest.raises(InvalidCareerField) as error:
        Month.parse(text, field="end_month")

    assert error.value.field == "end_month"
    assert error.value.message == "Choisissez un mois et une année valides."
