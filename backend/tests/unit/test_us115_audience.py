"""US-115 : choisir qui verra un poste — plusieurs unités, plusieurs domaines, aperçu de l'audience."""

from dataclasses import replace
from datetime import date

import pytest

from app.job.domain.eligibility import Candidate, ValidatedCertificate, audience, missing
from app.job.domain.errors import InvalidOpeningField
from app.job.domain.opening import Criteria, OpeningFields, validate_fields

TODAY = date(2026, 10, 12)
UNITS = {"PV": "Pétion-Ville", "DM": "Delmas", "AD": "Agence Démo", "M1": "Métropole 1"}


def candidate(units=(), certificates=(), grade="12", hire_date=date(2018, 9, 3)):
    return Candidate(
        certificates=tuple(ValidatedCertificate(level, domain) for level, domain in certificates),
        hire_date=hire_date,
        grade=grade,
        unit_codes=frozenset(units),
    )


# --- CA-01 : plusieurs unités ---------------------------------------------------------------


def test_ca01_l_employe_d_une_des_unites_voit_le_poste():
    criteria = Criteria(unit_codes=("PV", "DM"))
    assert missing(criteria, candidate(units=("DM", "M1")), TODAY) == []
    assert missing(criteria, candidate(units=("AD", "M1")), TODAY) == ["être rattaché à l'une des unités du poste"]


def test_ca01_une_seule_unite_garde_son_message():
    assert missing(Criteria(unit_codes=("PV",)), candidate(units=("AD",)), TODAY) == ["être rattaché à l'unité du poste"]


def test_ca01_une_region_inclut_ses_agences():
    # Les unités d'un employé comprennent la région de son agence (ResolveUnitCodes).
    assert missing(Criteria(unit_codes=("M1",)), candidate(units=("PV", "M1")), TODAY) == []


# --- CA-02 : plusieurs domaines -------------------------------------------------------------


def test_ca02_un_certificat_dans_l_un_des_domaines_suffit():
    criteria = Criteria(domains=("COMPTABILITE", "FINANCE"))
    assert missing(criteria, candidate(certificates=[("LICENCE", "FINANCE")]), TODAY) == []
    assert missing(criteria, candidate(certificates=[("LICENCE", "GESTION")]), TODAY) == [
        "un certificat validé en Comptabilité ou Finance"
    ]


def test_ca02_niveau_et_domaine_viennent_du_meme_certificat():
    criteria = Criteria(min_level="MASTER", domains=("COMPTABILITE", "FINANCE"))
    both = candidate(certificates=[("LICENCE", "FINANCE"), ("MASTER", "GESTION")])
    assert missing(criteria, both, TODAY) == ["un certificat de niveau Master validé en Comptabilité ou Finance"]
    assert missing(criteria, candidate(certificates=[("MASTER", "COMPTABILITE")]), TODAY) == []


# --- Saisie et lecture des critères ---------------------------------------------------------

FIELDS = OpeningFields(
    code="CC-2026-04", title="Chargé de crédit", unit_code="PV", target_grade="12", mission="Mission fictive.",
    opens_on=date(2026, 10, 15), closes_on=date(2026, 11, 15),
)


def test_les_listes_sont_nettoyees_sans_doublon_domaines_dans_l_ordre_de_la_liste():
    criteria = Criteria(domains=("FINANCE", "COMPTABILITE", "FINANCE"), unit_codes=("DM", "PV", "DM"))
    cleaned = validate_fields(replace(FIELDS, criteria=criteria), UNITS).criteria
    assert cleaned.domains == ("COMPTABILITE", "FINANCE")
    assert cleaned.unit_codes == ("DM", "PV")


@pytest.mark.parametrize(
    "criteria, field",
    [(Criteria(domains=("FINANCE", "ASTRONOMIE")), "domains"), (Criteria(unit_codes=("PV", "INCONNUE")), "criteria_unit_codes")],
)
def test_une_valeur_inconnue_est_refusee(criteria, field):
    with pytest.raises(InvalidOpeningField) as error:
        validate_fields(replace(FIELDS, criteria=criteria), UNITS)
    assert error.value.field == field


def test_les_criteres_se_lisent_en_francais():
    criteria = Criteria(domains=("COMPTABILITE", "FINANCE"), unit_codes=("PV", "DM"))
    assert criteria.describe(UNITS) == ["Domaines : Comptabilité ou Finance", "Unités : Pétion-Ville, Delmas"]
    assert Criteria(domains=("FINANCE",), unit_codes=("PV",)).describe(UNITS) == ["Domaine : Finance", "Unité : Pétion-Ville"]


# --- CA-04 : aperçu de l'audience -----------------------------------------------------------

PEOPLE = [
    candidate(units=("PV", "M1"), certificates=[("MASTER", "COMPTABILITE")], grade="12"),  # visible
    candidate(units=("PV", "M1"), certificates=[("LICENCE", "FINANCE")], grade="12"),  # niveau
    candidate(units=("DM", "M1"), certificates=[("MASTER", "FINANCE")], grade="8"),  # grade
    candidate(units=("DM", "M1"), certificates=[("MASTER", "GESTION")]),  # domaine
    candidate(units=("DM", "M1")),  # domaine
    candidate(units=("AD", "M1"), certificates=[("MASTER", "FINANCE")]),  # hors des unités
]


def test_ca04_audience_detaillee_critere_par_critere():
    criteria = Criteria(min_level="MASTER", domains=("COMPTABILITE", "FINANCE"), min_grade="10", unit_codes=("PV", "DM"))
    result = audience(criteria, PEOPLE, TODAY, UNITS)
    assert result.base == 5
    assert result.base_label == "employés rattachés à Pétion-Ville ou Delmas"
    assert [(step.excluded, step.reason) for step in result.steps] == [
        (2, "sans certificat validé en Comptabilité ou Finance"),
        (1, "sans certificat de niveau Master dans ces domaines"),
        (1, "grade inférieur à 10"),
    ]
    assert result.visible == 1


def test_ca04_le_nombre_visible_est_celui_de_la_regle_d_eligibilite():
    criteria = Criteria(min_level="LICENCE", domains=("FINANCE",), min_years_in_institution=5, min_grade="10", unit_codes=("DM",))
    expected = sum(1 for person in PEOPLE if not missing(criteria, person, TODAY))
    assert audience(criteria, PEOPLE, TODAY, UNITS).visible == expected


def test_ca04_sans_critere_tous_les_employes():
    result = audience(Criteria(), PEOPLE, TODAY, UNITS)
    assert (result.base, result.base_label, result.steps, result.visible) == (6, "employés en activité", (), 6)


def test_ca04_un_critere_rempli_par_tous_reste_affiche_avec_zero():
    result = audience(Criteria(min_years_in_institution=1, min_years_in_position=1), PEOPLE, TODAY, UNITS)
    assert [(step.excluded, step.reason) for step in result.steps] == [
        (0, "moins de 1 an d'ancienneté dans l'institution"),
        (0, "moins de 1 an d'ancienneté dans le poste"),
    ]


def test_ca05_personne_ne_verrait_le_poste():
    assert audience(Criteria(domains=("AGRONOMIE",)), PEOPLE, TODAY, UNITS).visible == 0
