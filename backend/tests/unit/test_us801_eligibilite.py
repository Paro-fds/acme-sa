"""US-801 : un employé est apte à un poste s'il remplit tous ses critères, sur ses seules données validées (EF-805)."""

from datetime import date

import pytest

from app.job.domain.eligibility import Candidate, ValidatedCertificate, missing
from app.job.domain.opening import Criteria

TODAY = date(2026, 10, 11)
CANDIDATE = Candidate(
    certificates=(ValidatedCertificate("LICENCE", "FINANCE"), ValidatedCertificate("BACCALAUREAT", None)),
    hire_date=date(2018, 9, 3),
    grade="12",
    unit_codes=frozenset({"PV", "M1", "DCR"}),
)


def test_sans_critere_tout_le_monde_est_apte():
    assert missing(Criteria(), CANDIDATE, TODAY) == []


def test_tous_les_criteres_remplis():
    criteria = Criteria(
        min_level="LICENCE",
        domain="FINANCE",
        min_years_in_institution=8,
        min_years_in_position=8,
        min_grade="10",
        unit_code="M1",
    )
    assert missing(criteria, CANDIDATE, TODAY) == []


@pytest.mark.parametrize(
    "criteria, reason",
    [
        (Criteria(min_level="MASTER"), "un certificat de niveau Master validé"),
        (Criteria(domain="INFORMATIQUE"), "un certificat validé en Informatique"),
        (Criteria(min_level="LICENCE", domain="COMPTABILITE"), "un certificat de niveau Licence validé en Comptabilité"),
        (Criteria(min_years_in_institution=9), "9 ans d'ancienneté dans l'institution"),
        (Criteria(min_years_in_position=9), "9 ans d'ancienneté dans le poste"),
        (Criteria(min_grade="13"), "le grade 13"),
        (Criteria(unit_code="GS2"), "être rattaché à l'unité du poste"),
    ],
)
def test_chaque_critere_manquant_est_nomme(criteria, reason):
    assert missing(criteria, CANDIDATE, TODAY) == [reason]


def test_le_niveau_et_le_domaine_doivent_venir_du_meme_certificat():
    candidate = Candidate(
        certificates=(ValidatedCertificate("MASTER", "GESTION"), ValidatedCertificate("BAC_PLUS_2", "FINANCE")),
        hire_date=None,
        grade="",
        unit_codes=frozenset(),
    )
    assert missing(Criteria(min_level="LICENCE", domain="FINANCE"), candidate, TODAY) == [
        "un certificat de niveau Licence validé en Finance"
    ]
    assert missing(Criteria(min_level="LICENCE", domain="GESTION"), candidate, TODAY) == []


def test_un_niveau_superieur_suffit():
    assert missing(Criteria(min_level="BAC_PLUS_2"), CANDIDATE, TODAY) == []


def test_l_anciennete_compte_les_annees_pleines():
    assert missing(Criteria(min_years_in_institution=8), CANDIDATE, date(2026, 9, 2)) == [
        "8 ans d'ancienneté dans l'institution"
    ]
    assert missing(Criteria(min_years_in_institution=8), CANDIDATE, date(2026, 9, 3)) == []


def test_sans_date_d_embauche_ni_grade_le_critere_n_est_pas_rempli():
    candidate = Candidate(certificates=(), hire_date=None, grade="", unit_codes=frozenset())
    assert missing(Criteria(min_years_in_institution=0, min_grade="1"), candidate, TODAY) == [
        "0 an d'ancienneté dans l'institution",
        "le grade 1",
    ]
