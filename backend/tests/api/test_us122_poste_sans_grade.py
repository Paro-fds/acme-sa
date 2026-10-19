"""US-122 — Saisir un poste sans grade.

- CA-01 : un poste s'enregistre et se publie sans grade visé ni grade minimum.
- CA-03 : sa visibilité ne dépend pas du grade.
"""

from tests.api.test_us801_postes_eligibles import _certificate
from tests.employees import EMP_A

OPENINGS = "/api/admin/openings"

FICHE = {
    "code": "SG-2026-01",
    "title": "Chargé fictif sans grade",
    "unit_code": "Agence Démo",
    "mission": "Mission fictive d'un poste sans grade.",
    "opens_on": "2026-10-01",
    "closes_on": "2026-11-15",
    "criteria": {"domains": ["FINANCE"], "min_level": "LICENCE"},
}


def test_ca01_ca03_un_poste_sans_grade_se_publie_et_se_voit(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "MASTER", "FINANCE")
    created = admin_client.post(OPENINGS, json=FICHE)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["target_grade"] == ""
    assert body["criteria"]["min_grade"] is None
    assert admin_client.post(f"{OPENINGS}/{body['id']}/publish").status_code == 200

    [item] = employee_client(EMP_A).get("/api/me/openings").json()["items"]
    assert item["title"] == "Chargé fictif sans grade"
    assert not any("rade" in line for line in item["criteria_lines"])
