"""Tests US-134 : la liste des employés de la refonte (année d'embauche, « N employés sur M »)."""

from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_B

SEARCH_URL = "/api/admin/employees/search"


def test_us134_ca05_annee_d_embauche(admin_client):
    items = {item["id"]: item for item in admin_client.get(SEARCH_URL, params={"page_size": 100}).json()["items"]}
    assert items[EMP_A.id]["hire_year"] == 2018
    assert items[EMP_B.id]["hire_year"] == 2024


def test_us134_ca04_total_de_tous_les_employes_actifs(admin_client):
    everyone = admin_client.get(SEARCH_URL).json()
    assert everyone["total"] == everyone["total_all"] == len(ACTIVE_EMPLOYEES)

    found = admin_client.get(SEARCH_URL, params={"search": "joseph"}).json()
    assert found["total"] == 1
    assert found["total_all"] == len(ACTIVE_EMPLOYEES)
