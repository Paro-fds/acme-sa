"""US-124 : publier un poste avec la lettre du directeur RH (règles du poste, sans base ni API)."""

from dataclasses import replace
from datetime import UTC, datetime

import pytest

from app.job.domain.errors import HrLetterRequired, OpeningTransitionRefused
from app.job.domain.opening import Actor, HrLetter, JobOpening, OpeningStatus
from tests.unit.test_us802_poste import FIELDS

AGENT = Actor("agent-1", "Agent RH Démo")
T0 = datetime(2026, 10, 17, 9, 0, tzinfo=UTC)
T1 = datetime(2026, 10, 17, 9, 30, tzinfo=UTC)
LETTER = HrLetter("job-letters/abc", "lettre-drh.pdf", "application/pdf", 2048, T1, AGENT)


def _draft() -> JobOpening:
    return JobOpening.create(replace(FIELDS), AGENT, T0)


def test_ca01_sans_lettre_l_agent_rh_ne_publie_pas():
    opening = _draft()
    with pytest.raises(HrLetterRequired) as error:
        opening.publish(AGENT, T1, letter_required=True)
    assert error.value.field == "letter"
    assert opening.status is OpeningStatus.DRAFT
    assert opening.letter is None


def test_ca01_avec_la_lettre_l_agent_rh_publie():
    opening = _draft()
    opening.publish(AGENT, T1, letter=LETTER, letter_required=True)
    assert opening.status is OpeningStatus.PUBLISHED
    assert opening.letter == LETTER


def test_ca02_l_administrateur_publie_sans_lettre():
    opening = _draft()
    opening.publish(Actor("admin-1", "Administrateur Démo"), T1)
    assert opening.status is OpeningStatus.PUBLISHED
    assert opening.letter is None


def test_ca04_la_lettre_ne_change_plus_apres_la_publication():
    opening = _draft()
    opening.publish(AGENT, T1, letter=LETTER, letter_required=True)
    with pytest.raises(OpeningTransitionRefused):
        opening.publish(AGENT, T1, letter=replace(LETTER, name="autre.pdf"), letter_required=True)
    assert opening.letter == LETTER
