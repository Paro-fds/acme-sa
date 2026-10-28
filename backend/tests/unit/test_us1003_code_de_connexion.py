"""US-1003 — Règles du code de connexion et du verrouillage progressif (domaine, sans base ni API)."""

from datetime import UTC, datetime, timedelta

import pytest

from app.auth.domain.errors import LoginCodeExpired, ResendTooSoon, TooManyCodes
from app.auth.domain.login_code import (
    MAX_CODE_ATTEMPTS,
    LoginChannel,
    LoginCode,
    hash_login_code,
    new_login_code,
)
from app.auth.domain.model import Account

NOW = datetime(2026, 10, 27, 9, 0, tzinfo=UTC)
KEY = "cle-de-test"


def _issued(code: str = "123456", session: str = "s1") -> LoginCode:
    login_code = LoginCode(employee_id="1001", channel=LoginChannel.EMAIL)
    login_code.issue(hash_login_code(KEY, "1001", LoginChannel.EMAIL, code), session, NOW)
    return login_code


def _check(login_code: LoginCode, code: str, *, session: str = "s1", at: datetime = NOW) -> bool:
    return login_code.check(hash_login_code(KEY, "1001", LoginChannel.EMAIL, code), session, at)


# CA-04 — Code à 6 chiffres, 5 minutes, usage unique, 3 essais, lié à la session et au canal


def test_ca04_le_code_a_six_chiffres():
    codes = {new_login_code() for _ in range(200)}
    assert all(len(code) == 6 and code.isdigit() for code in codes)
    assert len(codes) > 150  # tiré au hasard


def test_ca04_l_empreinte_depend_de_la_cle_du_canal_et_de_l_employe():
    reference = hash_login_code(KEY, "1001", LoginChannel.EMAIL, "123456")
    assert reference != "123456" and len(reference) == 64
    assert hash_login_code("autre-cle", "1001", LoginChannel.EMAIL, "123456") != reference
    assert hash_login_code(KEY, "1002", LoginChannel.EMAIL, "123456") != reference


def test_ca04_code_juste_une_seule_fois():
    login_code = _issued()
    assert _check(login_code, "123456")
    with pytest.raises(LoginCodeExpired):
        _check(login_code, "123456")


def test_ca04_le_code_expire_apres_5_minutes():
    login_code = _issued()
    assert _check(_issued(), "123456", at=NOW + timedelta(minutes=4, seconds=59))
    with pytest.raises(LoginCodeExpired):
        _check(login_code, "123456", at=NOW + timedelta(minutes=5))


def test_ca04_trois_essais_puis_le_code_ne_vaut_plus_rien():
    login_code = _issued()
    for remaining in (2, 1, 0):
        assert not _check(login_code, "000000")
        assert login_code.remaining_attempts == remaining
    assert MAX_CODE_ATTEMPTS == 3
    with pytest.raises(LoginCodeExpired):
        _check(login_code, "123456")


def test_ca04_le_code_est_lie_a_la_session_d_identification():
    login_code = _issued(session="s1")
    with pytest.raises(LoginCodeExpired):
        _check(login_code, "123456", session="s2")


# CA-05 — Renvoi : 60 secondes entre deux envois, 3 renvois au plus par 15 minutes


def test_ca05_pas_de_renvoi_avant_60_secondes():
    login_code = _issued()
    with pytest.raises(ResendTooSoon) as refused:
        login_code.issue("h2", "s1", NOW + timedelta(seconds=59))
    assert refused.value.extra["retry_after"] == 1
    login_code.issue("h2", "s1", NOW + timedelta(seconds=60))


def test_ca05_un_nouveau_code_invalide_le_precedent():
    login_code = _issued("123456")
    login_code.issue(hash_login_code(KEY, "1001", LoginChannel.EMAIL, "654321"), "s1", NOW + timedelta(seconds=60))
    assert not _check(login_code, "123456", at=NOW + timedelta(seconds=61))
    assert _check(login_code, "654321", at=NOW + timedelta(seconds=62))


def test_ca05_trois_renvois_au_plus_par_15_minutes():
    login_code = _issued()
    for minute in (1, 2, 3):
        login_code.issue(f"h{minute}", "s1", NOW + timedelta(minutes=minute))
    with pytest.raises(TooManyCodes) as refused:
        login_code.issue("h4", "s1", NOW + timedelta(minutes=4))
    assert refused.value.extra["retry_after"] == 11 * 60  # le premier envoi sort de la fenêtre à 15 min
    login_code.issue("h4", "s1", NOW + timedelta(minutes=15))


def test_ca05_un_renvoi_redonne_trois_essais():
    login_code = _issued()
    for _ in range(3):
        _check(login_code, "000000")
    login_code.issue(hash_login_code(KEY, "1001", LoginChannel.EMAIL, "777777"), "s1", NOW + timedelta(minutes=1))
    assert login_code.remaining_attempts == 3


# CA-02 — Verrouillage progressif : 15 minutes, puis le double, 24 heures au plus


def _fail(account: Account, at: datetime, times: int = 5) -> None:
    for _ in range(times):
        account.register_failure(at)


def test_ca02_premier_verrouillage_15_minutes():
    account = Account("1001", None)
    _fail(account, NOW, 4)
    assert not account.is_locked(NOW)
    account.register_failure(NOW)
    assert account.seconds_until_unlock(NOW) == 15 * 60


def test_ca02_chaque_nouveau_verrouillage_double():
    account = Account("1001", None)
    at = NOW
    for minutes in (15, 30, 60, 120):
        _fail(account, at)
        assert account.seconds_until_unlock(at) == minutes * 60
        at = account.locked_until  # le verrouillage expire : on recommence à se tromper


def test_ca02_jamais_plus_de_24_heures():
    account = Account("1001", None, lockouts=12)
    _fail(account, NOW)
    assert account.seconds_until_unlock(NOW) == 24 * 3600


def test_ca02_une_connexion_reussie_remet_a_zero():
    account = Account("1001", None)
    _fail(account, NOW)
    account.register_success()
    assert (account.failed_attempts, account.lockouts, account.locked_until) == (0, 0, None)
    _fail(account, NOW)
    assert account.seconds_until_unlock(NOW) == 15 * 60
