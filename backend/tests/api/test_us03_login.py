"""US-03 → US-101 (refonte) — Se connecter avec son mot de passe.

US-101 : un seul message quand la connexion échoue, quelle qu'en soit la cause (CA-03),
et le temps restant pendant la suspension (CA-06)."""

from tests.employees import EMP_A, EMP_B

URL = "/api/auth/login"
PASSWORD = "Bonjour-2026"
GENERIC = {
    "code": "INVALID_CREDENTIALS",
    "message": "Ces informations ne correspondent pas. Vérifiez votre nom, votre date de naissance et votre mot de passe.",
}


def _login(client, password=PASSWORD, employee=EMP_A):
    return client.post(URL, json=employee.identity(password=password))


def test_ca01_right_password_opens_a_session(client, account):
    account(EMP_A, PASSWORD)

    response = _login(client)

    assert response.status_code == 204
    assert "HttpOnly" in response.headers["set-cookie"]
    assert client.get("/api/me/profile").json()["employee_code"] == EMP_A.employee_code


def test_ca02_wrong_password_is_rejected_and_counted(client, account, container):
    account(EMP_A, PASSWORD)

    response = _login(client, password="mauvais-mdp")

    assert response.status_code == 401
    assert response.json()["error"] == GENERIC
    assert container.accounts.get(EMP_A.id).failed_attempts == 1
    assert "set-cookie" not in response.headers


def test_us101_ca03_remaining_attempts_are_never_shown(client, account):
    account(EMP_A, PASSWORD)

    errors = [_login(client, password="mauvais-mdp").json()["error"] for _ in range(4)]

    assert errors == [GENERIC] * 4


def test_ca03_fifth_error_locks_and_even_the_right_password_is_refused(client, account, clock):
    account(EMP_A, PASSWORD)
    for _ in range(4):
        _login(client, password="mauvais-mdp")

    fifth = _login(client, password="mauvais-mdp")
    sixth = _login(client, password=PASSWORD)

    for response in (fifth, sixth):
        assert response.status_code == 423
        assert response.json()["error"] == {
            "code": "ACCOUNT_LOCKED",
            "message": "Trop de tentatives. Réessayez dans 15 minutes.",
            "retry_after": 900,
        }
    assert "set-cookie" not in sixth.headers


def test_us101_ca06_retry_after_counts_down(client, account, clock):
    account(EMP_A, PASSWORD)
    for _ in range(5):
        _login(client, password="mauvais-mdp")

    clock.advance(minutes=10, seconds=30)
    response = _login(client)

    assert response.status_code == 423
    assert response.json()["error"]["retry_after"] == 270


def test_ca04_account_is_unlocked_after_15_minutes(client, account, clock, container):
    account(EMP_A, PASSWORD)
    for _ in range(5):
        _login(client, password="mauvais-mdp")

    clock.advance(minutes=15)
    response = _login(client)

    assert response.status_code == 204
    stored = container.accounts.get(EMP_A.id)
    assert stored.failed_attempts == 0
    assert stored.locked_until is None


def test_ca05_success_resets_the_counter(client, account, container):
    account(EMP_A, PASSWORD)
    for _ in range(3):
        _login(client, password="mauvais-mdp")

    _login(client)

    assert container.accounts.get(EMP_A.id).failed_attempts == 0


def test_us101_ca03_employee_without_password_gets_the_generic_answer(client, account):
    account(EMP_A, PASSWORD)
    wrong_password = _login(client, password="mauvais-mdp")

    without_password = _login(client, employee=EMP_B)

    assert without_password.status_code == wrong_password.status_code == 401
    assert without_password.json() == wrong_password.json() == {"error": GENERIC}


def test_ca07_session_expires_after_30_minutes_of_inactivity(client, account, clock):
    account(EMP_A, PASSWORD)
    _login(client)

    clock.advance(minutes=31)
    response = client.get("/api/me/profile")

    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "SESSION_EXPIRED",
        "message": "Votre session a expiré. Reconnectez-vous.",
    }


def test_ca07_activity_extends_the_session(client, account, clock):
    account(EMP_A, PASSWORD)
    _login(client)

    clock.advance(minutes=20)
    assert client.get("/api/me/profile").status_code == 200
    clock.advance(minutes=20)
    assert client.get("/api/me/profile").status_code == 200


def test_us101_ca03_unknown_identity_gets_the_same_answer_as_a_wrong_password(client, account):
    account(EMP_A, PASSWORD)
    wrong_password = _login(client, password="mauvais-mdp")

    unknown = client.post(URL, json=EMP_A.identity(birth_date="1996-03-16", password=PASSWORD))

    assert unknown.status_code == wrong_password.status_code == 401
    assert unknown.json() == wrong_password.json() == {"error": GENERIC}
