"""US-205 : une information non confirmée depuis 12 mois est périmée ; le rappel est dû 30 jours avant (RG-60, RG-61)."""

from datetime import UTC, date, datetime

import pytest

from app.dossier.domain.freshness import PERISHABLE, Freshness, expiry, freshness, reminder

CONFIRMED = datetime(2026, 10, 4, 9, 0, tzinfo=UTC)


def test_une_information_se_perime_un_an_apres_sa_derniere_confirmation():
    assert expiry(CONFIRMED) == date(2027, 10, 4)
    assert reminder(CONFIRMED) == date(2027, 9, 4)


def test_un_29_fevrier_se_perime_le_28_fevrier():
    assert expiry(datetime(2028, 2, 29, tzinfo=UTC)) == date(2029, 2, 28)


@pytest.mark.parametrize(
    "today, state",
    [
        (date(2027, 9, 3), Freshness.FRESH),
        (date(2027, 9, 4), Freshness.DUE_SOON),
        (date(2027, 10, 3), Freshness.DUE_SOON),
        (date(2027, 10, 4), Freshness.STALE),
        (date(2029, 1, 1), Freshness.STALE),
    ],
)
def test_etat_d_une_information(today, state):
    assert freshness(CONFIRMED, today) is state


def test_ca03_le_niveau_d_etudes_ne_se_perime_jamais():
    assert "education_level" not in PERISHABLE
    assert set(PERISHABLE) == {
        "telephone",
        "address",
        "email",
        "emergency_contact",
        "agency_confirmed",
        "position_confirmed",
        "hire_date_confirmed",
    }
