"""US-502 — Rattacher les valeurs inconnues (EF-504 ; RG-17).

Référentiel de test (tests/referential.py) : PV → Pétion-Ville, AD → Agence Démo, PB « À rattacher ».
Export de test : agences PV (EMP-A, EMP-D1, EMP-D2, EMP-E), AD (EMP-H1), PB (EMP-H2), et d'autres valeurs.
"""

import pytest

from tests.employees import EMP_H2
from tests.referential import MAPPINGS, workbook

URL = "/api/admin/referential"


@pytest.fixture
def referential(container):
    container.import_referential().execute(workbook(), "referentiel.xlsx", "admin")


def _to_attach(admin_client):
    return {(item["column"], item["value"]): item["employees"] for item in admin_client.get(URL).json()["to_attach"]}


def test_ca01_une_valeur_sans_correspondance_va_dans_a_rattacher_avec_le_nombre_d_employes(admin_client, referential):
    to_attach = _to_attach(admin_client)

    assert to_attach[("agency_code", "PB")] == 1
    assert ("agency_code", "PV") not in to_attach
    assert ("agency_code", "AD") not in to_attach


def test_ca01_sans_referentiel_toutes_les_valeurs_sont_a_rattacher(admin_client):
    to_attach = _to_attach(admin_client)

    assert to_attach[("agency_code", "PV")] >= 1
    assert all(count >= 1 for count in to_attach.values())


def test_ca01_les_valeurs_vides_ne_sont_pas_listees(admin_client):
    assert all(value.strip() for _, value in _to_attach(admin_client))


def test_ca02_ces_employes_sont_unite_a_confirmer_sans_etre_bloques(referential, employee_client):
    response = employee_client(EMP_H2).get("/api/me/profile")

    assert response.status_code == 200
    assert response.json()["affectation"]["agency"] is None


def test_ca03_une_fois_rattachee_la_valeur_disparait_et_l_employe_prend_le_libelle(admin_client, container, employee_client):
    container.import_referential().execute(workbook(), "referentiel.xlsx", "admin")
    assert ("agency_code", "PB") in _to_attach(admin_client)

    pb_attached = [["agency_code", "PB", "PV"] if row[1] == "PB" else row for row in MAPPINGS]
    container.import_referential().execute(workbook(mappings=pb_attached), "referentiel.xlsx", "admin")

    assert ("agency_code", "PB") not in _to_attach(admin_client)
    assert employee_client(EMP_H2).get("/api/me/profile").json()["affectation"]["agency"] == "Pétion-Ville"
