from datetime import UTC, datetime, timedelta


class FakeClock:
    """Horloge simulée : le temps n'avance que lorsque le test l'appelle."""

    def __init__(self, start: datetime = datetime(2026, 10, 4, 9, 0, tzinfo=UTC)) -> None:
        self._now = start

    def now(self) -> datetime:
        return self._now

    def advance(self, **delta) -> None:
        self._now += timedelta(**delta)
