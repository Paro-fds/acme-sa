"""US-122 — Saisir un poste sans grade : le grade visé devient facultatif (CA-01)."""

from dataclasses import replace

from app.job.domain.opening import validate_fields
from tests.unit.test_us802_poste import FIELDS, UNITS


def test_ca01_un_poste_sans_grade_vise_est_accepte():
    fields = validate_fields(replace(FIELDS, target_grade="  "), UNITS)
    assert fields.target_grade == ""


def test_ca04_un_grade_deja_saisi_est_garde():
    assert validate_fields(FIELDS, UNITS).target_grade == "10"
