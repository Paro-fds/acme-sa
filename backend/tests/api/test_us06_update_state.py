"""US-06 — Voir l'état de sa mise à jour (T-06.2)."""

import pytest

from tests.employees import EMP_A

ENDPOINTS = ["/api/me/update", "/api/me/profile"]


def _update(client, url):
    body = client.get(url).json()
    return body if url.endswith("/update") else body["update"]


@pytest.mark.parametrize("url", ENDPOINTS)
def test_ca01_without_update_the_state_is_not_done(employee_client, url):
    update = _update(employee_client(EMP_A), url)

    assert update["state"] == "NOT_DONE"
    assert update["accepted"] is None
    assert update["updated_at"] is None
    assert update["submitted_at"] is None


@pytest.mark.parametrize("url", ENDPOINTS)
def test_ca02_draft_is_in_progress_with_last_save_date(employee_client, clock, draft, url):
    draft(EMP_A)
    clock.advance(minutes=5)
    draft(EMP_A, {"telephone_number": "+509 3722 2222"})

    update = _update(employee_client(EMP_A), url)

    assert update["state"] == "IN_PROGRESS"
    assert update["updated_at"].startswith("2026-10-04T09:05:00")
    assert update["submitted_at"] is None


@pytest.mark.parametrize("url", ENDPOINTS)
def test_ca03_submitted_is_done_with_submission_date(employee_client, clock, submitted, url):
    submitted(EMP_A, {"telephone_number": "+509 3722 2222"})

    update = _update(employee_client(EMP_A), url)

    assert update["state"] == "DONE"
    assert update["submitted_at"].startswith("2026-10-04T09:00:00")


@pytest.mark.parametrize("url", ENDPOINTS)
def test_ca04_answer_no_is_not_done(employee_client, url):
    client = employee_client(EMP_A)
    assert client.post("/api/me/update/decision", json={"accepted": False}).status_code == 200

    update = _update(client, url)

    assert update["state"] == "NOT_DONE"
    assert update["accepted"] is False


def test_dates_are_returned_with_their_time_zone(employee_client, clock, draft):
    draft(EMP_A)

    update = _update(employee_client(EMP_A), "/api/me/update")

    assert update["updated_at"].endswith(("Z", "+00:00"))
