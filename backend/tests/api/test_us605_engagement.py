"""US-605 — Mesurer si les employés reviennent (EF-607 ; critères de réussite n°3 et « plaisir »).

Sans notifications (US-701 reportée), toute connexion est spontanée : « sans relance » se calculera quand les envois
existeront (modèle de données §3, connexion qui ne suit aucun message).
"""

from tests.api.test_us301_depot import _deposit
from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B

ENGAGEMENT = "/api/admin/engagement"
PASSWORD = "Bonjour-2026"


def _login(client, employee):
    response = client.post("/api/auth/login", json=employee.identity(password=PASSWORD))
    assert response.status_code == 204, response.text


def test_ca01_chaque_connexion_est_enregistree_avec_sa_date(client, account, container, clock):
    account(EMP_A, PASSWORD)

    _login(client, EMP_A)
    first = clock.now()
    clock.advance(minutes=40)
    _login(client, EMP_A)

    logins = container.employee_logins.all()
    assert [(login.employee_id, login.at) for login in logins] == [(EMP_A.id, first), (EMP_A.id, clock.now())]


def test_ca01_une_connexion_refusee_n_est_pas_comptee(client, account, container):
    account(EMP_A, PASSWORD)

    client.post("/api/auth/login", json=EMP_A.identity(password="Mauvais-2026"))

    assert container.employee_logins.all() == []


def test_ca01_la_premiere_connexion_compte_aussi(client, container):
    response = client.post(
        "/api/auth/register", json=EMP_B.identity(password=PASSWORD, password_confirmation=PASSWORD)
    )

    assert response.status_code == 204, response.text
    assert [login.employee_id for login in container.employee_logins.all()] == [EMP_B.id]


def test_ca01_le_tableau_compte_les_connexions_des_30_derniers_jours(client, account, admin_client, clock):
    account(EMP_A, PASSWORD)
    account(EMP_B, PASSWORD)
    _login(client, EMP_A)
    _login(client, EMP_A)
    _login(client, EMP_B)

    engagement = admin_client.get(ENGAGEMENT).json()

    assert (engagement["logins_30_days"], engagement["employees_30_days"], engagement["active_employees"]) == (3, 2, 7)


def test_ca02_les_reponses_a_la_question_en_un_clic_sont_comptees(employee_client, admin_client):
    client = employee_client(EMP_A)
    complete_profile(client)
    first, second = _deposit(client).json(), _deposit(client).json()
    client.post(f"/api/me/certificates/{first['id']}/feedback", json={"rating": 3})
    client.post(f"/api/me/certificates/{second['id']}/feedback", json={"rating": 1})

    feedback = admin_client.get(ENGAGEMENT).json()["feedback"]

    assert feedback == [
        {"rating": 3, "label": "Facile", "count": 1},
        {"rating": 2, "label": "Correct", "count": 0},
        {"rating": 1, "label": "Difficile", "count": 1},
    ]


def test_ca02_aucun_commentaire_libre_n_est_expose(admin_client):
    assert set(admin_client.get(ENGAGEMENT).json()) == {"logins_30_days", "employees_30_days", "active_employees", "feedback"}
