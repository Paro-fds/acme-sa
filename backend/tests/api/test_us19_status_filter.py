"""US-19 — Filtrer par statut (T-19.1)."""

import pytest

from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_B, EMP_H1, EMP_H2

URL = "/api/admin/employees"


def _list(client, **params):
    body = client.get(URL, params=params).json()
    return [item["id"] for item in body["items"]], body


@pytest.fixture
def campaign(submitted, draft):
    """EMP-A soumis, EMP-B en brouillon (CA-01, CA-02)."""
    submitted(EMP_A, {"telephone_number": "+50937222222"})
    draft(EMP_B, {"telephone_number": "+50937333333"})


def test_ca01_not_updated_lists_draft_and_others_but_not_the_submitted(admin_client, campaign):
    ids, body = _list(admin_client, status="NOT_UPDATED")

    assert EMP_A.id not in ids
    assert EMP_B.id in ids
    assert set(ids) == {employee.id for employee in ACTIVE_EMPLOYEES} - {EMP_A.id}
    assert body["total"] == 6
    assert {item["status"] for item in body["items"]} == {"NOT_UPDATED"}


def test_ca02_updated_lists_only_the_submitted(admin_client, campaign):
    ids, body = _list(admin_client, status="UPDATED")

    assert ids == [EMP_A.id]
    assert body["total"] == 1


def test_no_status_lists_everyone(admin_client, campaign):
    assert _list(admin_client)[1]["total"] == 7
    assert _list(admin_client, status="")[1]["total"] == 7


def test_ca03_filter_combines_with_search(admin_client, submitted):
    submitted(EMP_H1, {"telephone_number": "+50937444444"})

    assert _list(admin_client, search="pierre", status="UPDATED")[0] == [EMP_H1.id]
    assert _list(admin_client, search="pierre", status="NOT_UPDATED")[0] == [EMP_H2.id]


def test_ca04_counts_of_each_status(admin_client, campaign):
    _, body = _list(admin_client, status="UPDATED")

    # Les compteurs ne dépendent pas du filtre choisi : ils servent à afficher les trois puces.
    assert body["counts"] == {"all": 7, "updated": 1, "not_updated": 6}


def test_ca04_counts_follow_the_search(admin_client, submitted):
    submitted(EMP_H1)

    _, body = _list(admin_client, search="pierre")

    assert body["counts"] == {"all": 2, "updated": 1, "not_updated": 1}


def test_filter_is_applied_before_pagination(admin_client, campaign):
    _, body = _list(admin_client, status="NOT_UPDATED", page_size=4, page=2)

    assert len(body["items"]) == 2
    assert body["total"] == 6
    assert body["page_count"] == 2


@pytest.mark.parametrize("status", ["DRAFT", "IN_PROGRESS", "updated", "TOUS"])
def test_ca06_unknown_status_gives_422(admin_client, status):
    response = admin_client.get(URL, params={"status": status})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_INPUT"
