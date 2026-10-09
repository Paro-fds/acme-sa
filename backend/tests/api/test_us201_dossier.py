"""US-201 — Voir mon dossier et ma progression (EF-201, EF-206 ; RG-01, RG-05, RG-17)."""

import pytest

from tests.employees import EMP_A, EMP_E, EMP_H1, EMP_H2, SECRET_MARKER
from tests.referential import workbook

PROFILE = "/api/me/profile"


@pytest.fixture
def referential(container):
    """Référentiel de test (tests/referential.py) : PV → Pétion-Ville (Métropole 1), AD → Agence Démo, PB « À rattacher »."""
    container.import_referential().execute(workbook(), "referentiel.xlsx", "admin")


# --- CA-01 : libellés officiels, jamais la valeur brute ------------------------------------------


def test_ca01_agence_region_et_direction_avec_leur_libelle_officiel(employee_client, referential):
    profile = employee_client(EMP_A).get(PROFILE).json()

    assert profile["affectation"] == {
        "agency": "Pétion-Ville",
        "region": "Métropole 1",
        "direction": "Direction du Crédit",
    }


def test_ca01_un_service_donne_la_direction_a_laquelle_il_est_rattache(employee_client, referential):
    profile = employee_client(EMP_H1).get(PROFILE).json()

    assert profile["affectation"] == {
        "agency": "Agence Démo",
        "region": "Métropole 1",
        "direction": "Direction des Opérations",
    }


def test_ca01_la_valeur_brute_de_l_export_ne_sort_pas(employee_client, referential):
    profile = employee_client(EMP_A).get(PROFILE).json()

    assert "agency_code" not in profile
    assert "department" not in profile
    assert SECRET_MARKER not in str(profile)


# --- CA-03 : unité inconnue → « Unité à confirmer », sans bloquer ----------------------------------


def test_ca03_une_agence_a_rattacher_reste_vide_sans_bloquer(employee_client, referential):
    response = employee_client(EMP_H2).get(PROFILE)

    assert response.status_code == 200
    assert response.json()["affectation"]["agency"] is None
    assert response.json()["affectation"]["region"] is None
    assert response.json()["affectation"]["direction"] == "Direction des Opérations"


def test_ca03_sans_referentiel_importe_tout_est_a_confirmer(employee_client):
    response = employee_client(EMP_A).get(PROFILE)

    assert response.status_code == 200
    assert response.json()["affectation"] == {"agency": None, "region": None, "direction": None}


def test_ca03_une_direction_vide_dans_l_export_est_a_confirmer(employee_client, referential):
    assert employee_client(EMP_E).get(PROFILE).json()["affectation"]["direction"] is None


# --- CA-02 : pourcentage ------------------------------------------------------------------------
# Une information compte quand l'employé l'a saisie ou confirmée (modèle de données §4.3, US-202) :
# une valeur seulement présente dans l'export ne compte pas encore.

COORDINATES = {"telephone": "3712 3456", "address": "12 rue Capois", "email": "jean@exemple.test", "no_email": False}


def _save(client, **changes):
    client.post("/api/me/dossier/consent", json={"information_notice": True, "whatsapp": False})
    assert client.put("/api/me/dossier/coordinates", json=COORDINATES | changes).status_code == 200


def test_ca02_au_depart_les_8_elements_sont_a_completer(employee_client):
    completion = employee_client(EMP_A).get(PROFILE).json()["completion"]

    assert (completion["complete"], completion["total"], completion["percent"]) == (0, 8, 0)


def test_ca02_pourcentage_et_detail_des_8_elements(employee_client):
    client = employee_client(EMP_A)
    _save(client)

    completion = client.get(PROFILE).json()["completion"]

    assert (completion["complete"], completion["total"], completion["percent"]) == (3, 8, 37)
    assert [(e["key"], e["complete"]) for e in completion["elements"]] == [
        ("telephone", True),
        ("address", True),
        ("email", True),
        ("emergency_contact", False),
        ("education_level", False),
        ("agency_confirmed", False),
        ("position_confirmed", False),
        ("hire_date_confirmed", False),
    ]


def test_ca02_sans_email_un_element_de_moins(employee_client):
    client = employee_client(EMP_E)
    _save(client, email="")

    assert client.get(PROFILE).json()["completion"]["percent"] == 25


def test_ca02_le_pourcentage_change_des_qu_une_information_est_enregistree(employee_client):
    client = employee_client(EMP_E)
    before = client.get(PROFILE).json()["completion"]["percent"]

    _save(client)

    assert (before, client.get(PROFILE).json()["completion"]["percent"]) == (0, 37)
