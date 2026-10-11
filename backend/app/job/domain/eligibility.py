"""US-801 : éligibilité d'un employé à un poste (EF-805, RG-72).

- Seules les données validées comptent (CA-03) : certificats validés, données de l'export RH.
- Un employé est apte s'il remplit **tous** les critères du poste ; `missing` dit ce qui manque, en français.
- Niveau et domaine : un même certificat validé doit les atteindre (« un certificat de niveau Licence validé en Finance »).
- Ancienneté dans le poste : comptée depuis la date d'embauche tant que l'historique des mouvements n'existe pas
  (EF-907, US-903).
- L'indicateur informe et ne décide jamais : une nomination reste une décision humaine.
"""

from dataclasses import dataclass
from datetime import date

from app.certificate.domain.certificate import DOMAIN_LABELS
from app.job.domain.opening import Criteria
from app.shared.domain.levels import LEVELS_BY_CODE


@dataclass(frozen=True)
class ValidatedCertificate:
    level: str
    domain: str | None


@dataclass(frozen=True)
class Candidate:
    certificates: tuple[ValidatedCertificate, ...]
    """Certificats validés seulement."""
    hire_date: date | None
    grade: str
    unit_codes: frozenset[str]
    """Unités de l'employé dans le référentiel : agence, région en cours, direction, service."""


def full_years(since: date, today: date) -> int:
    return today.year - since.year - ((today.month, today.day) < (since.month, since.day))


def _years(value: int) -> str:
    return f"{value} an{'s' if value > 1 else ''}"


def _rank(level_code: str) -> int | None:
    level = LEVELS_BY_CODE.get(level_code)
    return level.rank if level else None


def _certificate_reason(criteria: Criteria, candidate: Candidate) -> str | None:
    if not criteria.min_level and not criteria.domain:
        return None
    wanted = _rank(criteria.min_level) if criteria.min_level else None
    for certificate in candidate.certificates:
        rank = _rank(certificate.level)
        if wanted is not None and (rank is None or rank < wanted):
            continue
        if criteria.domain and certificate.domain != criteria.domain:
            continue
        return None
    if criteria.min_level and criteria.domain:
        level = LEVELS_BY_CODE[criteria.min_level].label
        return f"un certificat de niveau {level} validé en {DOMAIN_LABELS[criteria.domain]}"
    if criteria.min_level:
        return f"un certificat de niveau {LEVELS_BY_CODE[criteria.min_level].label} validé"
    return f"un certificat validé en {DOMAIN_LABELS[criteria.domain]}"


def missing(criteria: Criteria, candidate: Candidate, today: date) -> list[str]:
    """Ce qui manque à l'employé pour ce poste ; liste vide = apte."""
    reasons: list[str] = []
    certificate = _certificate_reason(criteria, candidate)
    if certificate:
        reasons.append(certificate)
    years = full_years(candidate.hire_date, today) if candidate.hire_date else None
    for required, where in (
        (criteria.min_years_in_institution, "l'institution"),
        (criteria.min_years_in_position, "le poste"),
    ):
        if required is not None and (years is None or years < required):
            reasons.append(f"{_years(required)} d'ancienneté dans {where}")
    if criteria.min_grade:
        grade = candidate.grade.strip()
        if not grade.isdigit() or int(grade) < int(criteria.min_grade):
            reasons.append(f"le grade {criteria.min_grade}")
    if criteria.unit_code and criteria.unit_code not in candidate.unit_codes:
        reasons.append("être rattaché à l'unité du poste")
    return reasons
