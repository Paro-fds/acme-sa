"""US-125 : déconnexion après 15 minutes sans activité (employés et espace de gestion).

Toute requête authentifiée prolonge la session ; sans rien enregistrer, l'écran signale l'activité par `keep-alive`.
"""

from tests.employees import EMP_A

EMPLOYEE_KEEP_ALIVE = "/api/auth/keep-alive"
ADMIN_KEEP_ALIVE = "/api/admin/auth/keep-alive"


# --- CA-01 : 15 minutes, réglables ----------------------------------------------------------


def test_ca01_quinze_minutes_par_defaut(settings):
    assert settings.employee_session_minutes == 15
    assert settings.admin_session_minutes == 15


def test_ca01_l_ecran_connait_les_durees(client):
    response = client.get("/api/auth/session-options")
    assert response.status_code == 200
    # US-1017 : 5 minutes sans action côté employé (modèle du directeur) ; la gestion garde 15 minutes.
    assert response.json() == {"employee_idle_minutes": 5, "admin_idle_minutes": 15}


def test_ca01_employe_deconnecte_apres_15_minutes_sans_activite(clock, employee_client):
    jean = employee_client(EMP_A)
    clock.advance(minutes=15)
    response = jean.post(EMPLOYEE_KEEP_ALIVE)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"


def test_ca01_gestion_deconnectee_apres_15_minutes_sans_activite(clock, admin_client):
    clock.advance(minutes=15)
    response = admin_client.get("/api/admin/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_EXPIRED"


# --- CA-02 : une activité sans enregistrement prolonge la session ----------------------------


def test_us1017_la_session_employe_est_bornee_a_15_minutes_meme_avec_de_l_activite(clock, employee_client):
    jean = employee_client(EMP_A)
    clock.advance(minutes=14)
    assert jean.post(EMPLOYEE_KEEP_ALIVE).status_code == 204
    clock.advance(minutes=1)
    response = jean.post(EMPLOYEE_KEEP_ALIVE)
    assert response.status_code == 401 and response.json()["error"]["code"] == "SESSION_EXPIRED"


def test_ca02_l_activite_en_gestion_prolonge_la_session(clock, admin_client):
    clock.advance(minutes=14)
    assert admin_client.post(ADMIN_KEEP_ALIVE).status_code == 204
    clock.advance(minutes=14)
    assert admin_client.get("/api/admin/me").status_code == 200


def test_ca02_sans_session_rien_n_est_prolonge(client):
    assert client.post(EMPLOYEE_KEEP_ALIVE).status_code == 401
    assert client.post(ADMIN_KEEP_ALIVE).status_code == 401


def test_ca02_une_session_employe_ne_prolonge_pas_une_session_de_gestion(employee_client):
    assert employee_client(EMP_A).post(ADMIN_KEEP_ALIVE).status_code == 403
