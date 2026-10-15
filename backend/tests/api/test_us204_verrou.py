"""US-204 — Savoir ce qui me reste avant de déposer (EF-207 ; RG-06, RG-07 ; D-01)."""

from tests.conftest import complete_profile
from tests.employees import EMP_A

PROFILE = "/api/me/profile"


def test_ca01_tant_que_le_profil_n_est_pas_complet_les_elements_manquants_sont_listes(employee_client):
    completion = employee_client(EMP_A).get(PROFILE).json()["completion"]

    assert completion["is_complete"] is False
    assert [e["key"] for e in completion["elements"] if not e["complete"]] == [
        "telephone",
        "address",
        "email",
        "emergency_contact",
        "education_level",
        "agency_confirmed",
        "position_confirmed",
        "hire_date_confirmed",
    ]


def test_ca02_a_8_sur_8_le_profil_est_complet(employee_client):
    client = employee_client(EMP_A)

    complete_profile(client)

    completion = client.get(PROFILE).json()["completion"]
    assert (completion["is_complete"], completion["percent"], completion["complete"]) == (True, 100, 8)


def test_ca03_le_profil_reste_consultable_quel_que_soit_son_etat(employee_client):
    assert employee_client(EMP_A).get(PROFILE).status_code == 200
