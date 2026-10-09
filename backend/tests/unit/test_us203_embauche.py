"""US-203 CA-05 : une date d'embauche moins de 18 ans après la naissance est suspecte (RG-16)."""

from datetime import date

import pytest

from app.dossier.domain.hr_information import hired_too_young


@pytest.mark.parametrize(
    ("birth", "hire", "suspect"),
    [
        (date(1990, 7, 2), date(2015, 1, 15), False),
        (date(2000, 3, 1), date(2018, 3, 1), False),  # 18 ans pile
        (date(2000, 3, 1), date(2018, 2, 28), True),
        (date(2004, 2, 29), date(2022, 2, 28), True),  # né un 29 février : 18 ans le 1er mars
        (date(2004, 2, 29), date(2022, 3, 1), False),
        (date(1990, 7, 2), None, False),  # pas de date d'embauche : rien à contrôler
    ],
)
def test_ca05_embauche_avant_18_ans(birth, hire, suspect):
    assert hired_too_young(birth, hire) is suspect
