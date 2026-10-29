"""Règle de blocage après des mots de passe erronés (US-03, US-15)."""

from datetime import timedelta

MAX_FAILED_ATTEMPTS = 5
LOCK_DURATION = timedelta(minutes=15)
MAX_LOCK_DURATION = timedelta(hours=24)
"""US-1003 : plafond du verrouillage progressif des employés."""
