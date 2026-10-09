from app.admin.domain.engagement import RATING_LABELS, WINDOW, Engagement, FeedbackStats, LoginStats, RatingCount
from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.clock import Clock


class GetEngagement:
    """US-605 : connexions des 30 derniers jours (toutes spontanées tant qu'aucune relance n'existe, US-702) et avis."""

    def __init__(self, logins: LoginStats, feedback: FeedbackStats, employees: EmployeeRepository, clock: Clock) -> None:
        self._logins = logins
        self._feedback = feedback
        self._employees = employees
        self._clock = clock

    def execute(self) -> Engagement:
        counts = self._logins.execute(self._clock.now() - WINDOW)
        answers = self._feedback.execute()
        return Engagement(
            counts.logins,
            counts.employees,
            len(self._employees.list_all()),
            tuple(RatingCount(rating, label, answers.get(rating, 0)) for rating, label in RATING_LABELS.items()),
        )
