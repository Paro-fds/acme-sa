"""US-1014 — Saisir la date en huit chiffres (modèle d'authentification du directeur)."""

from datetime import date

import pytest

from app.auth.domain.birth_date import same_birth_date, typed_birth_date


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("27101990", date(1990, 10, 27)),
        ("27/10/1990", date(1990, 10, 27)),  # séparateurs ignorés
        (" 27 10 1990 ", date(1990, 10, 27)),
        ("2710199", None),  # sept chiffres
        ("271019900", None),
        ("32101990", None),  # 32 octobre
        ("29022001", None),  # pas bissextile
        ("1990-10-27", None),  # huit chiffres, mais lus 19/90/1027
        ("", None),
    ],
)
def test_ca02_lecture_jjmmaaaa(raw, expected):
    assert typed_birth_date(raw) == expected


def test_ca03_comparaison_et_date_absente():
    assert same_birth_date(date(1990, 10, 27), typed_birth_date("27101990"))
    assert not same_birth_date(date(1990, 10, 27), typed_birth_date("28101990"))
    assert not same_birth_date(None, typed_birth_date("27101990"))
    assert not same_birth_date(date(1990, 10, 27), None)
