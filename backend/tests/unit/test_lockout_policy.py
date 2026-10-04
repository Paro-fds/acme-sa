"""T-03.3 : règle de blocage (5 échecs → 15 minutes), avec horloge simulée."""

from datetime import timedelta

from app.auth.domain.model import Account
from app.auth.domain.lockout import LOCK_DURATION, MAX_FAILED_ATTEMPTS
from tests.fake_clock import FakeClock


def account() -> Account:
    return Account("1001", "hash")


def test_policy_values():
    assert MAX_FAILED_ATTEMPTS == 5
    assert LOCK_DURATION == timedelta(minutes=15)


def test_four_failures_do_not_lock():
    clock, value = FakeClock(), account()

    for _ in range(4):
        value.register_failure(clock.now())

    assert not value.is_locked(clock.now())
    assert value.remaining_attempts == 1


def test_fifth_failure_locks_for_15_minutes():
    clock, value = FakeClock(), account()

    for _ in range(5):
        value.register_failure(clock.now())

    assert value.is_locked(clock.now())
    clock.advance(minutes=14, seconds=59)
    assert value.is_locked(clock.now())
    clock.advance(seconds=1)
    assert not value.is_locked(clock.now())


def test_failures_after_an_expired_lock_start_again_from_zero():
    clock, value = FakeClock(), account()
    for _ in range(5):
        value.register_failure(clock.now())
    clock.advance(minutes=15)

    value.register_failure(clock.now())

    assert value.failed_attempts == 1
    assert not value.is_locked(clock.now())


def test_success_resets_the_counter():
    clock, value = FakeClock(), account()
    for _ in range(3):
        value.register_failure(clock.now())

    value.register_success()

    assert value.failed_attempts == 0
    assert value.locked_until is None
