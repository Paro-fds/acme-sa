"""US-17 — Liste des employés (Walking Skeleton : CA-01)."""

from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_I

URL = "/api/admin/employees"


def test_ca01_lists_active_employees_sorted_with_their_status(admin_client, submitted):
    submitted(EMP_A, {"telephone_number": "+50937222222"})

    body = admin_client.get(URL).json()

    assert body["total"] == len(ACTIVE_EMPLOYEES)
    names = [(item["last_name"], item["first_name"]) for item in body["items"]]
    assert names == sorted(names, key=lambda name: (name[0].replace("É", "E"), name[1]))
    statuses = {item["id"]: item["status"] for item in body["items"]}
    assert statuses[EMP_A.id] == "UPDATED"
    assert {status for employee_id, status in statuses.items() if employee_id != EMP_A.id} == {"NOT_UPDATED"}
    assert EMP_I.id not in statuses
