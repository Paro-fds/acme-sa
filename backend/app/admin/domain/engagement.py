"""US-605 : mesurer si les employés reviennent (critère de réussite n°3) et ce qu'ils pensent du dépôt (« plaisir »)."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol

WINDOW = timedelta(days=30)

RATING_LABELS = {3: "Facile", 2: "Correct", 1: "Difficile"}


class LoginCountsLike(Protocol):
    logins: int
    employees: int


class LoginStats(Protocol):
    """Implémenté par le module `auth` (journal des connexions)."""

    def execute(self, since: datetime) -> LoginCountsLike: ...


class FeedbackStats(Protocol):
    """Implémenté par le module `certificate` (avis en un clic) : note → nombre de réponses."""

    def execute(self) -> dict[int, int]: ...


@dataclass(frozen=True)
class RatingCount:
    rating: int
    label: str
    count: int


@dataclass(frozen=True)
class Engagement:
    logins_30_days: int
    employees_30_days: int
    active_employees: int
    feedback: tuple[RatingCount, ...]
