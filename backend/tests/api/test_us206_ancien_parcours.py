"""US-206 — Retirer l'ancien parcours de mise à jour (PRD §7)."""

import pytest

from tests.employees import EMP_A


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/me/update"),
        ("get", "/api/me/update/fields"),
        ("post", "/api/me/update/decision"),
        ("put", "/api/me/update/changes"),
        ("post", "/api/me/update/submit"),
        ("post", "/api/me/update/reopen"),
        ("post", "/api/me/update/discard"),
        ("get", "/api/me/documents"),
        ("post", "/api/me/documents"),
        ("delete", "/api/me/documents/1"),
        ("get", "/api/me/documents/1/file"),
    ],
)
def test_ca03_les_routes_employe_de_l_ancien_parcours_n_existent_plus(employee_client, method, path):
    client = employee_client(EMP_A)

    response = getattr(client, method)(path, **({"json": {}} if method in ("post", "put") else {}))

    assert response.status_code == 404


def test_ca03_ce_qui_a_ete_envoye_reste_lisible_par_les_rh(admin_client, submitted):
    submitted(EMP_A, {"telephone_number": "+50937220000"})

    folder = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()

    assert folder["status"] == "UPDATED"
