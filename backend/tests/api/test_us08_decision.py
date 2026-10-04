"""US-08 — Choisir de mettre à jour (Walking Skeleton : CA-01)."""

from tests.employees import EMP_A

URL = "/api/me/update/decision"


def test_ca01_yes_opens_a_draft(employee_client, container):
    response = employee_client(EMP_A).post(URL, json={"accepted": True})

    assert response.status_code == 200
    assert response.json()["state"] == "IN_PROGRESS"
    update = container.updates.get_for_employee(EMP_A.id)
    assert update.accepted is True
    assert update.status == "DRAFT"
