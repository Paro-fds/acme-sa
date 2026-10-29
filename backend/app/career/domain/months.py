"""Dates du parcours : mois et année seulement (D-07, AD-V2-06)."""

import re
from dataclasses import dataclass
from datetime import date

from app.career.domain.errors import InvalidCareerField

INVALID_MONTH_MESSAGE = "Choisissez un mois et une année valides."
_MONTH = re.compile(r"^(\d{4})-(\d{2})$")


@dataclass(frozen=True, order=True)
class Month:
    year: int
    month: int

    @classmethod
    def parse(cls, text: str, *, field: str) -> "Month":
        """« AAAA-MM » → Month ; InvalidCareerField sur `field` sinon."""
        match = _MONTH.match(text or "")
        if match is None:
            raise InvalidCareerField(INVALID_MONTH_MESSAGE, field=field)
        year, month = int(match[1]), int(match[2])
        if not (1900 <= year <= 2100 and 1 <= month <= 12):
            raise InvalidCareerField(INVALID_MONTH_MESSAGE, field=field)
        return cls(year, month)

    @classmethod
    def of(cls, day: date) -> "Month":
        return cls(day.year, day.month)

    def first_day(self) -> date:
        return date(self.year, self.month, 1)

    def __str__(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"
