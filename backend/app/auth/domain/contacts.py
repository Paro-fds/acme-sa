"""US-1005 : un contact nouvellement enregistré ne reçoit pas de code pendant 72 heures (doc PAM).

PAM retient, pour chaque employé et chaque canal, le dernier contact vu dans Vault et le moment où il a changé.
Le premier contact vu n'est pas bloqué : sinon, le jour du lancement, personne ne pourrait se connecter.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.auth.domain.login_code import LoginChannel

CONTACT_HOLD = timedelta(hours=72)


@dataclass
class SeenContact:
    employee_id: str
    channel: LoginChannel
    value: str | None
    changed_at: datetime | None = None
    """Moment où le changement a été vu ; rien pour le premier contact vu."""

    def observe(self, value: str | None, now: datetime) -> bool:
        """Retient le contact lu dans Vault ; vrai s'il a changé."""
        if value == self.value:
            return False
        self.value = value
        self.changed_at = now
        return True

    def lift(self) -> None:
        """US-1026 : main levée de la DRH ; le contact reste celui de Vault, seul le gel disparaît."""
        self.changed_at = None

    def held_until(self) -> datetime | None:
        return None if self.changed_at is None else self.changed_at + CONTACT_HOLD

    def is_held(self, now: datetime) -> bool:
        return self.value is not None and self.changed_at is not None and now < self.held_until()
