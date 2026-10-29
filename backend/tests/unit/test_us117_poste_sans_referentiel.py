"""US-117 : un poste se crée même sans référentiel ; l'unité du poste est alors un texte libre."""

from dataclasses import replace
from datetime import date

import pytest

from app.job.domain.errors import InvalidOpeningField
from app.job.domain.opening import Criteria, OpeningFields, validate_fields

NO_REFERENTIAL: dict[str, str] = {}
UNITS = {"AD": "Agence Démo"}

FIELDS = OpeningFields(
    code="CC-2026-01",
    title="Chargé de crédit",
    unit_code="Agence de Pétion-Ville",
    target_grade="10",
    mission="Instruire les demandes de crédit de l'agence.",
    opens_on=date(2026, 10, 15),
    closes_on=date(2026, 11, 15),
    criteria=Criteria(min_level="LICENCE", domains=("FINANCE",)),
)


def test_ca01_sans_referentiel_l_unite_du_poste_est_un_texte_libre():
    cleaned = validate_fields(replace(FIELDS, unit_code="  Agence de Pétion-Ville "), NO_REFERENTIAL)
    assert cleaned.unit_code == "Agence de Pétion-Ville"


@pytest.mark.parametrize("unit", ["", "   ", "x" * 121])
def test_ca01_sans_referentiel_l_unite_reste_obligatoire_et_courte(unit):
    with pytest.raises(InvalidOpeningField) as error:
        validate_fields(replace(FIELDS, unit_code=unit), NO_REFERENTIAL)
    assert error.value.field == "unit_code"


def test_ca01_sans_referentiel_aucune_unite_ne_peut_restreindre_la_visibilite():
    with pytest.raises(InvalidOpeningField) as error:
        validate_fields(replace(FIELDS, criteria=Criteria(unit_codes=("PV",))), NO_REFERENTIAL)
    assert error.value.field == "criteria_unit_codes"


def test_ca04_avec_le_referentiel_l_unite_se_choisit_de_nouveau_dans_la_liste():
    with pytest.raises(InvalidOpeningField) as error:
        validate_fields(FIELDS, UNITS)
    assert error.value.message == "Choisissez une unité du référentiel."
    assert validate_fields(replace(FIELDS, unit_code="AD"), UNITS).unit_code == "AD"
