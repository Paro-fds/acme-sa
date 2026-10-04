"""US-18 — Rechercher un employé (T-18.2, T-18.3)."""

import pytest

from tests.employees import EMP_A, EMP_B, EMP_E, EMP_H1, EMP_H2, EMP_I

URL = "/api/admin/employees"


def _ids(client, search, **params):
    body = client.get(URL, params={"search": search, **params}).json()
    return {item["id"] for item in body["items"]}, body["total"]


def test_ca01_search_by_last_name(admin_client):
    ids, total = _ids(admin_client, "pierre")

    assert ids == {EMP_H1.id, EMP_H2.id}
    assert total == 2


@pytest.mark.parametrize(
    ("search", "expected"),
    [
        ("jos", {EMP_A.id}),  # CA-02
        ("ETIENNE", {EMP_E.id}),  # CA-03
        ("étienne", {EMP_E.id}),
        ("jean joseph", {EMP_A.id}),  # CA-04
        ("joseph jean", {EMP_A.id}),
        ("AC-1008", {EMP_B.id}),  # CA-05
        ("1008", {EMP_B.id}),
    ],
)
def test_search_cases(admin_client, search, expected):
    assert _ids(admin_client, search)[0] == expected


def test_ca06_submitted_new_name_is_found(admin_client, submitted):
    submitted(EMP_A, {"last_name": "JOSEPH-PAUL"})

    ids, _ = _ids(admin_client, "paul")

    assert EMP_A.id in ids


def test_ca06_draft_name_is_not_searchable(admin_client, draft):
    draft(EMP_A, {"last_name": "JOSEPH-PAUL"})

    assert EMP_A.id not in _ids(admin_client, "paul")[0]


def test_ca07_no_result_gives_an_empty_page(admin_client):
    body = admin_client.get(URL, params={"search": "zzz"}).json()

    assert body["items"] == []
    assert body["total"] == 0
    assert body["page_count"] == 1


def test_ca08_empty_search_lists_everyone(admin_client):
    assert _ids(admin_client, "")[1] == 7
    assert _ids(admin_client, "   ")[1] == 7


def test_ca09_inactive_employee_is_never_found(admin_client):
    assert _ids(admin_client, "charles") == (set(), 0)
    assert _ids(admin_client, "AC-1006") == (set(), 0)
    assert EMP_I.id not in _ids(admin_client, "")[0]


def test_search_results_are_paginated(admin_client):
    body = admin_client.get(URL, params={"search": "pierre", "page_size": 1, "page": 2}).json()

    assert body["total"] == 2
    assert body["page_count"] == 2
    assert [item["id"] for item in body["items"]] == [EMP_H2.id]


def test_search_that_is_too_long_gives_422(admin_client):
    assert admin_client.get(URL, params={"search": "a" * 101}).status_code == 422
