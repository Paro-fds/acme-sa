"""US-16 — Tableau de bord : statistiques de la campagne (T-16.2)."""

from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_B, EMP_E, EMP_H1, EMP_I

URL = "/api/admin/statistics"


def test_ca01_statistics_of_the_campaign(admin_client, container, submitted, draft):
    submitted(EMP_A, {"telephone_number": "+50937222222"})
    draft(EMP_B, {"telephone_number": "+50937333333"})
    container.record_decision().execute(EMP_H1.id, False)

    response = admin_client.get(URL)

    assert response.status_code == 200
    assert response.json() == {"total": 7, "updated": 1, "not_updated": 6, "progress": 14}


def test_ca02_draft_is_counted_as_not_updated_and_never_mentioned(admin_client, draft):
    draft(EMP_B, {"telephone_number": "+50937333333"})

    body = admin_client.get(URL).json()

    assert body["updated"] == 0
    assert body["not_updated"] == len(ACTIVE_EMPLOYEES)
    assert set(body) == {"total", "updated", "not_updated", "progress"}
    assert "draft" not in admin_client.get(URL).text.lower()
    assert "brouillon" not in admin_client.get(URL).text.lower()


def test_ca03_inactive_employee_is_not_counted(admin_client):
    # Le CSV de test contient 8 lignes, dont EMP-I inactif.
    assert admin_client.get(URL).json()["total"] == len(ACTIVE_EMPLOYEES) == 7


def test_ca03_submission_of_an_inactive_employee_is_ignored(admin_client, container):
    # Cas théorique (un employé désactivé dans le CSV après avoir soumis) : il n'est compté nulle part.
    container.record_decision().execute(EMP_I.id, True)
    container.submit_update().execute(EMP_I.id, True)

    assert admin_client.get(URL).json() == {"total": 7, "updated": 0, "not_updated": 7, "progress": 0}


def test_ca04_campaign_not_started(admin_client):
    assert admin_client.get(URL).json() == {"total": 7, "updated": 0, "not_updated": 7, "progress": 0}


def test_ca05_figures_follow_new_submissions(admin_client, submitted):
    submitted(EMP_A)
    assert admin_client.get(URL).json()["updated"] == 1

    submitted(EMP_E)

    assert admin_client.get(URL).json() == {"total": 7, "updated": 2, "not_updated": 5, "progress": 29}


def test_statistics_require_an_admin_session(client, employee_client):
    assert client.get(URL).status_code == 401
    assert employee_client(EMP_A).get(URL).status_code == 403
