"""US-132 — Retrouver le tableau de bord RH de la refonte : candidatures en cours (CA-04) et connexions par
semaine (CA-05)."""

from datetime import date

from fastapi.testclient import TestClient

from app.auth.api.dependencies import SESSION_COOKIE
from app.job.domain.application import JobApplication
from app.job.domain.opening import Actor, JobOpening, OpeningFields
from tests.conftest import admin_session, employee_login
from tests.employees import EMP_A, EMP_B, EMP_E

DASHBOARD = "/api/admin/dashboard"
ENGAGEMENT = "/api/admin/engagement"


def _opening(container, clock, code):
    return container.openings.add(
        JobOpening.create(
            OpeningFields(code, f"Poste {code}", "AD", "12", "Mission.", date(2026, 10, 1), date(2026, 11, 15)),
            Actor("rh", "Agent RH (fictif)"),
            clock.now(),
        )
    )


def _apply(container, clock, opening, employee):
    return container.applications.add(
        JobApplication.submit(opening.id, employee.id, "", Actor(employee.id, "Employé fictif"), clock.now())
    )


def test_ca04_les_candidatures_en_cours_et_le_nombre_de_postes(admin_client, container, clock):
    first = _opening(container, clock, "CC-2026-01")
    second = _opening(container, clock, "CC-2026-02")
    _opening(container, clock, "CC-2026-03")  # sans candidature
    _apply(container, clock, first, EMP_A)
    _apply(container, clock, first, EMP_B)
    withdrawn = _apply(container, clock, second, EMP_E)
    withdrawn.withdraw(Actor(EMP_E.id, "Employé fictif"), clock.now())
    container.applications.save(withdrawn)

    to_process = admin_client.get(DASHBOARD).json()["to_process"]

    assert (to_process["applications_in_progress"], to_process["openings_with_applications"]) == (2, 1)


def test_ca04_sans_candidature(admin_client):
    to_process = admin_client.get(DASHBOARD).json()["to_process"]

    assert (to_process["applications_in_progress"], to_process["openings_with_applications"]) == (0, 0)


def _login(client, employee):
    employee_login(client, employee)  # US-1003


def test_ca05_employes_differents_connectes_par_periode_de_7_jours(app, client, container, clock):
    _login(client, EMP_A)  # il y a 15 jours : 3e période en partant de la fin
    clock.advance(days=7)
    _login(client, EMP_A)  # il y a 8 jours : 2e période
    _login(client, EMP_B)
    clock.advance(days=4)
    _login(client, EMP_B)  # il y a 4 jours : ces 7 derniers jours
    clock.advance(minutes=1)  # US-1003 : 60 secondes entre deux codes
    _login(client, EMP_B)
    clock.advance(days=4)

    # La session RH s'ouvre après le saut dans le temps (elle expire au bout de 15 minutes sans activité).
    with TestClient(app, cookies={SESSION_COOKIE: admin_session(container)}) as admin:
        weekly = admin.get(ENGAGEMENT).json()["weekly_employees"]

    assert weekly == [0, 0, 0, 0, 0, 1, 2, 1]
