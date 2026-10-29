"""US-130 CA-04 : les RH répondent sous 5 jours ouvrables (du lundi au vendredi) après le dépôt."""

from datetime import date, timedelta

REVIEW_BUSINESS_DAYS = 5


def review_deadline(submitted_on: date) -> date:
    """Dernier jour de réponse : le 5e jour ouvrable qui suit le dépôt."""
    day, remaining = submitted_on, REVIEW_BUSINESS_DAYS
    while remaining:
        day += timedelta(days=1)
        if day.weekday() < 5:
            remaining -= 1
    return day
