from dataclasses import dataclass
from datetime import datetime
from app.auth.domain.logins import LoginJournal


@dataclass(frozen=True)
class LoginCounts:
    logins: int
    employees: int


class CountLogins:
    """US-605 : connexions depuis une date, et nombre d'employés différents qui se sont connectés."""

    def __init__(self, logins: LoginJournal) -> None:
        self._logins = logins

    def execute(self, since: datetime, until: datetime | None = None) -> LoginCounts:
        """US-132 CA-05 : `until` (exclu) borne la période, pour compter semaine par semaine."""
        recent = [login for login in self._logins.since(since) if until is None or login.at < until]
        return LoginCounts(len(recent), len({login.employee_id for login in recent}))
