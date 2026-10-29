"""US-135 : la publication de postes de la refonte (candidatures reçues, « saisi par vous »)."""

from app.job.domain.application import JobApplication
from app.job.domain.opening import Actor
from tests.api.test_us802_postes import FICHE, _create, agent_client, referential  # noqa: F401
from tests.employees import EMP_A, EMP_B

OPENINGS = "/api/admin/openings"


def _apply(container, clock, opening_id: int, employee_id: str) -> None:
    actor = Actor(employee_id, "Employé fictif")
    container.applications.add(JobApplication.submit(opening_id, employee_id, "Motivation fictive.", actor, clock.now()))


def test_us135_ca03_nombre_de_candidatures_par_poste(admin_client, container, clock):
    with_two = _create(admin_client)
    without = _create(admin_client, code="cc-2026-02")
    _apply(container, clock, with_two["id"], EMP_A.id)
    _apply(container, clock, with_two["id"], EMP_B.id)

    items = {item["id"]: item for item in admin_client.get(OPENINGS).json()["items"]}
    assert items[with_two["id"]]["application_count"] == 2
    assert items[without["id"]]["application_count"] == 0


def test_us135_ca03_saisi_par_vous(admin_client, agent_client):  # noqa: F811
    mine = _create(agent_client)
    theirs = _create(admin_client, code="cc-2026-02")

    items = {item["id"]: item for item in agent_client.get(OPENINGS).json()["items"]}
    assert items[mine["id"]]["created_by_me"] is True
    assert items[theirs["id"]]["created_by_me"] is False
    other_view = {item["id"]: item for item in admin_client.get(OPENINGS).json()["items"]}
    assert other_view[mine["id"]]["created_by_me"] is False
