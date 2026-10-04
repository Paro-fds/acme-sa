from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    """Source de l'heure courante (UTC), injectée pour pouvoir la simuler dans les tests."""

    def now(self) -> datetime: ...
