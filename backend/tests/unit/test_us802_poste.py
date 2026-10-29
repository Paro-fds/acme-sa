"""US-802 : règles d'un poste ouvert (fiche, statuts, trace des critères), sans base ni API."""

from dataclasses import replace
from datetime import UTC, date, datetime

import pytest

from app.job.domain.errors import InvalidOpeningField, OpeningLocked, OpeningTransitionRefused
from app.job.domain.opening import Actor, Criteria, JobOpening, OpeningFields, OpeningStatus, validate_fields

UNITS = {"AD": "Agence Démo", "DCR": "Direction du Crédit"}
AGENT = Actor("agent-1", "Agent RH Démo")
ADMIN = Actor("admin-1", "Administrateur Démo")
T0 = datetime(2026, 10, 4, 9, 0, tzinfo=UTC)
T1 = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)

FIELDS = OpeningFields(
    code="CC-2026-01",
    title="Chargé de crédit",
    unit_code="AD",
    target_grade="10",
    mission="Instruire les demandes de crédit de l'agence.",
    opens_on=date(2026, 10, 15),
    closes_on=date(2026, 11, 15),
    criteria=Criteria(min_level="LICENCE", domains=("FINANCE",), min_years_in_institution=2),
)


def _opening(**changes) -> JobOpening:
    return JobOpening.create(replace(FIELDS, **changes), AGENT, T0)


# --- CA-01 : la fiche ---------------------------------------------------------------------


def test_ca01_une_fiche_complete_est_acceptee():
    assert validate_fields(FIELDS, UNITS) == FIELDS


def test_ca01_le_code_est_mis_en_majuscules_et_les_espaces_retires():
    cleaned = validate_fields(replace(FIELDS, code=" cc-2026-01 ", title="  Chargé de crédit "), UNITS)
    assert cleaned.code == "CC-2026-01"
    assert cleaned.title == "Chargé de crédit"


@pytest.mark.parametrize(
    "changes, field",
    [
        ({"code": ""}, "code"),
        ({"code": "CC 2026"}, "code"),
        ({"title": " "}, "title"),
        ({"unit_code": ""}, "unit_code"),
        ({"unit_code": "INCONNUE"}, "unit_code"),
        # US-122 : le grade visé n'est plus obligatoire (test_us122_poste_sans_grade.py).
        ({"target_grade": "dix"}, "target_grade"),
        ({"mission": ""}, "mission"),
        ({"opens_on": None}, "opens_on"),
        ({"closes_on": None}, "closes_on"),
        ({"closes_on": date(2026, 10, 14)}, "closes_on"),
    ],
)
def test_ca01_chaque_champ_obligatoire_est_controle(changes, field):
    with pytest.raises(InvalidOpeningField) as error:
        validate_fields(replace(FIELDS, **changes), UNITS)
    assert error.value.field == field


@pytest.mark.parametrize(
    "criteria, field",
    [
        (Criteria(min_level="INCONNU"), "min_level"),
        (Criteria(min_level="CERTIFICATION_PRO"), "min_level"),
        (Criteria(domains=("ASTRONOMIE",)), "domains"),
        (Criteria(min_years_in_institution=-1), "min_years_in_institution"),
        (Criteria(min_years_in_position=51), "min_years_in_position"),
        (Criteria(min_grade="huit"), "min_grade"),
        (Criteria(unit_codes=("INCONNUE",)), "criteria_unit_codes"),
    ],
)
def test_ca01_les_criteres_sont_controles(criteria, field):
    with pytest.raises(InvalidOpeningField) as error:
        validate_fields(replace(FIELDS, criteria=criteria), UNITS)
    assert error.value.field == field


def test_ca01_aucun_critere_n_est_obligatoire():
    assert validate_fields(replace(FIELDS, criteria=Criteria()), UNITS).criteria == Criteria()


def test_ca01_les_criteres_se_lisent_en_francais():
    criteria = Criteria(
        min_level="LICENCE",
        domains=("FINANCE",),
        min_years_in_institution=2,
        min_years_in_position=1,
        min_grade="8",
        unit_codes=("AD",),
    )
    assert criteria.describe(UNITS) == [
        "Niveau d'études minimum : Licence",
        "Domaine : Finance",
        "Ancienneté dans l'institution : 2 ans au moins",
        "Ancienneté dans le poste : 1 an au moins",
        "Grade minimum : 8",
        "Unité : Agence Démo",
    ]
    assert Criteria().describe(UNITS) == []


# --- CA-02 : statuts, date et auteur ------------------------------------------------------


def test_ca02_un_poste_saisi_est_un_brouillon_date_et_signe():
    opening = _opening()
    assert opening.status is OpeningStatus.DRAFT
    assert [(c.status, c.at, c.actor) for c in opening.history] == [(OpeningStatus.DRAFT, T0, AGENT)]


def test_ca02_publier_cloturer_pourvoir():
    opening = _opening()
    opening.publish(ADMIN, T1)
    opening.close(ADMIN, T1)
    opening.fill(ADMIN, T1)
    assert [c.status for c in opening.history] == [
        OpeningStatus.DRAFT,
        OpeningStatus.PUBLISHED,
        OpeningStatus.CLOSED,
        OpeningStatus.FILLED,
    ]
    assert opening.history[-1].actor == ADMIN
    assert opening.status.label == "Pourvu"


def test_ca02_un_poste_publie_peut_etre_pourvu_directement():
    opening = _opening()
    opening.publish(ADMIN, T1)
    opening.fill(ADMIN, T1)
    assert opening.status is OpeningStatus.FILLED


@pytest.mark.parametrize(
    "steps, refused",
    [
        ([], "close"),
        ([], "fill"),
        (["publish"], "publish"),
        (["publish", "close"], "close"),
        (["publish", "fill"], "publish"),
    ],
)
def test_ca02_les_changements_de_statut_impossibles_sont_refuses(steps, refused):
    opening = _opening()
    for step in steps:
        getattr(opening, step)(ADMIN, T1)
    with pytest.raises(OpeningTransitionRefused):
        getattr(opening, refused)(ADMIN, T1)


def test_ca02_un_brouillon_se_modifie_sans_trace_de_critere():
    opening = _opening()
    opening.update(replace(FIELDS, criteria=Criteria(min_level="MASTER")), AGENT, T1)
    assert opening.criteria == Criteria(min_level="MASTER")
    assert opening.criteria_changes == []


def test_ca02_un_critere_modifie_apres_publication_est_trace():
    opening = _opening()
    opening.publish(ADMIN, T1)
    opening.update(replace(FIELDS, criteria=Criteria(min_level="MASTER", domains=("FINANCE",))), AGENT, T1)
    [change] = opening.criteria_changes
    assert change.actor == AGENT
    assert change.at == T1
    assert change.before == (
        "Niveau d'études minimum : Licence",
        "Domaine : Finance",
        "Ancienneté dans l'institution : 2 ans au moins",
    )
    assert change.after == ("Niveau d'études minimum : Master", "Domaine : Finance")


def test_ca02_modifier_la_mission_d_un_poste_publie_ne_trace_aucun_critere():
    opening = _opening()
    opening.publish(ADMIN, T1)
    opening.update(replace(FIELDS, mission="Nouvelle mission."), AGENT, T1)
    assert opening.mission == "Nouvelle mission."
    assert opening.criteria_changes == []


@pytest.mark.parametrize("last_step", ["close", "fill"])
def test_ca02_un_poste_cloture_ou_pourvu_ne_se_modifie_plus(last_step):
    opening = _opening()
    opening.publish(ADMIN, T1)
    getattr(opening, last_step)(ADMIN, T1)
    with pytest.raises(OpeningLocked):
        opening.update(FIELDS, AGENT, T1)
