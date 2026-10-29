"""US-1015 — Captcha et verrous par code et par adresse IP (modèle d'authentification du directeur).

Le client de test a toujours la même adresse ; `other_ip_client` joue un autre appareil.
"""

import re

import pytest

from app.auth.domain.login_lock import LoginLock, lock_duration, typed_code
from tests.conftest import employee_login
from tests.employees import EMP_A, EMP_B

IDENTIFY, CODE, VERIFY = "/api/auth/identify", "/api/auth/code", "/api/auth/verify"
GENERIC = {"code": "INVALID_CREDENTIALS", "message": "Informations incorrectes."}


def _identify(client, employee=EMP_A, **overrides):
    body = {"employee_code": employee.employee_code, "birth_date": employee.typed_birth_date, **overrides}
    return client.post(IDENTIFY, json=body)


def _wrong(client, employee=EMP_A, times=1):
    for _ in range(times):
        response = _identify(client, employee, birth_date="01011900")
    return response


def _answer(question: str) -> str:
    left, right = map(int, re.findall(r"\d+", question))
    return str(left + right)


def _lock(container, key="code#AC-1001") -> LoginLock:
    return container.login_locks.get(key)


# --- CA-01 : à 3 échecs, un calcul est demandé ; la réponse reste sur le serveur ------------------


def test_ca01_pas_de_calcul_avant_3_echecs(client):
    assert _wrong(client, times=2).json()["error"] == GENERIC


def test_ca01_calcul_au_troisieme_echec(client, container):
    error = _wrong(client, times=3).json()["error"]

    assert error["message"] == "Informations incorrectes."
    assert re.fullmatch(r"Combien font [2-9] \+ [2-9] \?", error["captcha"])
    assert set(error) == {"code", "message", "captcha"}  # la réponse n'est jamais envoyée


def test_ca01_bonne_date_sans_reponse_au_calcul_refusee(client):
    _wrong(client, times=3)

    response = _identify(client)
    assert response.status_code == 401 and "captcha" in response.json()["error"]


def test_ca01_bonne_date_et_bon_calcul_ouvrent_l_etape_2(client, container):
    question = _wrong(client, times=3).json()["error"]["captcha"]

    response = _identify(client, captcha=_answer(question))
    assert response.status_code == 200
    assert (_lock(container).failures, _lock(container, "ip#testclient").failures) == (0, 0)


def test_ca01_un_calcul_faux_compte_comme_un_echec(client, container):
    question = _wrong(client, times=3).json()["error"]["captcha"]

    _identify(client, captcha=str(int(_answer(question)) + 1))
    assert _lock(container).failures == 4


# --- CA-02 : verrous de 1 min, 15 min puis 1 h ; pendant le verrou, le compteur est figé -------------


@pytest.mark.parametrize("failures, minutes", [(4, None), (5, 1), (9, 1), (10, 15), (14, 15), (15, 60), (40, 60)])
def test_ca02_durees_des_verrous(failures, minutes):
    duration = lock_duration(failures)
    assert (None if duration is None else duration.total_seconds() / 60) == minutes


def test_ca02_cinq_echecs_verrouillent_une_minute_meme_avec_la_bonne_date(client, container, clock):
    question = _wrong(client, times=5).json()["error"]["captcha"]

    locked = _identify(client, captcha=_answer(question))
    assert locked.status_code == 401 and locked.json()["error"]["message"] == "Informations incorrectes."
    assert _lock(container).failures == 5  # le compteur n'augmente plus pendant le verrou
    clock.advance(minutes=1)
    assert _identify(client, captcha=_answer(question)).status_code == 200


def test_ca02_dix_echecs_verrouillent_15_minutes(client, container, clock):
    for _ in range(9):
        _wrong(client)
        clock.advance(minutes=1)
    _wrong(client)

    lock = _lock(container)
    assert lock.failures == 10 and (lock.locked_until - clock.now()).total_seconds() == 15 * 60


# --- CA-03 : deux compteurs, par code et par adresse IP ----------------------------------------------


def test_ca03_l_adresse_ip_verrouille_aussi_les_autres_codes(client):
    for employee in (EMP_A, EMP_B, EMP_A, EMP_B, EMP_A):
        _wrong(client, employee)

    assert _identify(client, EMP_B).status_code == 401  # 5 échecs depuis cette adresse


def test_ca03_un_autre_appareil_n_est_pas_bloque_par_l_adresse(client, other_ip_client):
    _wrong(client, EMP_A, times=5)

    assert _identify(other_ip_client, EMP_B).status_code == 200
    assert _identify(other_ip_client, EMP_A).status_code == 401  # le code reste verrouillé


@pytest.mark.parametrize("raw", ["", "x", "AC 1001 ; DROP", "é" * 20])
def test_ca03_un_code_illisible_partage_le_compteur_inconnu(raw):
    assert typed_code(raw) == "INCONNU"


def test_ca03_codes_illisibles_un_seul_compteur(client, container):
    for raw in ("??", "!!", "x"):
        client.post(IDENTIFY, json={"employee_code": raw, "birth_date": "01011900"})

    assert _lock(container, "code#INCONNU").failures == 3


# --- CA-04 : avertissement à partir de 5 échecs ; un code faux ne verrouille pas ----------------------


def test_ca04_avertissement_par_courriel_a_partir_de_5_echecs(client, container):
    outbox = container.email_sender.outbox
    _wrong(client, times=4)
    assert not [m for m in outbox if "refusés" in m.body]

    _wrong(client)

    (alert,) = [m for m in outbox if "refusés" in m.body]
    assert alert.to == "jean.joseph@exemple.test"
    assert EMP_A.employee_code not in alert.body and "http" not in alert.body


def test_ca04_un_avertissement_qui_echoue_ne_change_pas_la_reponse(client, container):
    class Broken:
        outbox: list = []

        def send(self, to, subject, body, html=None):
            from app.auth.domain.ports import EmailNotSent

            raise EmailNotSent("panne")

    container.email_sender = Broken()
    assert _wrong(client, times=5).json()["error"]["message"] == "Informations incorrectes."


def test_ca04_des_codes_faux_ne_verrouillent_pas(client, clock, container):
    _identify(client)
    sent = client.post(CODE, json={"channel": "EMAIL"}).json()
    for _ in range(3):
        client.post(VERIFY, json={"code": "000000" if sent["local_code"] != "000000" else "111111"})

    assert _lock(container) is None or _lock(container).failures == 0
    clock.advance(seconds=60)
    employee_login(client, EMP_A)
