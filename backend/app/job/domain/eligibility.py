"""US-801 : éligibilité d'un employé à un poste (EF-805, RG-72).

- Seules les données validées comptent (CA-03) : certificats validés, données de l'export RH.
- Un employé est apte s'il remplit **tous** les critères du poste ; `missing` dit ce qui manque, en français.
- Niveau et domaine : un même certificat validé doit les atteindre (« un certificat de niveau Licence validé en Finance »).
- Ancienneté dans le poste : comptée depuis la date d'embauche tant que l'historique des mouvements n'existe pas
  (EF-907, US-903).
- L'indicateur informe et ne décide jamais : une nomination reste une décision humaine.
- US-115 : plusieurs domaines (un certificat dans l'un d'eux suffit) et plusieurs unités (rattaché à l'une d'elles) ;
  `audience` compte, pour l'Agent RH qui saisit le poste, combien d'employés le verront et ce qui écarte les autres.
"""

from dataclasses import dataclass
from datetime import date

from app.job.domain.opening import Criteria, domains_text
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


def _has_certificate(candidate: Candidate, min_level: str | None, domains: tuple[str, ...]) -> bool:
    """Un même certificat validé atteint le niveau et appartient à l'un des domaines."""
    wanted = _rank(min_level) if min_level else None
    for certificate in candidate.certificates:
        rank = _rank(certificate.level)
        if wanted is not None and (rank is None or rank < wanted):
            continue
        if domains and certificate.domain not in domains:
            continue
        return True
    return False


def _in_units(candidate: Candidate, unit_codes: tuple[str, ...]) -> bool:
    return not unit_codes or bool(candidate.unit_codes & set(unit_codes))


def _certificate_reason(criteria: Criteria, candidate: Candidate) -> str | None:
    if not criteria.min_level and not criteria.domains:
        return None
    if _has_certificate(candidate, criteria.min_level, criteria.domains):
        return None
    if criteria.min_level and criteria.domains:
        level = LEVELS_BY_CODE[criteria.min_level].label
        return f"un certificat de niveau {level} validé en {domains_text(criteria.domains)}"
    if criteria.min_level:
        return f"un certificat de niveau {LEVELS_BY_CODE[criteria.min_level].label} validé"
    return f"un certificat validé en {domains_text(criteria.domains)}"


def _grade_ok(candidate: Candidate, min_grade: str) -> bool:
    grade = candidate.grade.strip()
    return grade.isdigit() and int(grade) >= int(min_grade)


def _years_ok(candidate: Candidate, required: int, today: date) -> bool:
    return candidate.hire_date is not None and full_years(candidate.hire_date, today) >= required


def missing(criteria: Criteria, candidate: Candidate, today: date) -> list[str]:
    """Ce qui manque à l'employé pour ce poste ; liste vide = apte."""
    reasons: list[str] = []
    certificate = _certificate_reason(criteria, candidate)
    if certificate:
        reasons.append(certificate)
    for required, where in (
        (criteria.min_years_in_institution, "l'institution"),
        (criteria.min_years_in_position, "le poste"),
    ):
        if required is not None and not _years_ok(candidate, required, today):
            reasons.append(f"{_years(required)} d'ancienneté dans {where}")
    if criteria.min_grade and not _grade_ok(candidate, criteria.min_grade):
        reasons.append(f"le grade {criteria.min_grade}")
    if not _in_units(candidate, criteria.unit_codes):
        reasons.append(f"être rattaché à l'{'une des unités' if len(criteria.unit_codes) > 1 else 'unité'} du poste")
    return reasons


@dataclass(frozen=True)
class AudienceStep:
    excluded: int
    reason: str


@dataclass(frozen=True)
class Audience:
    """US-115 CA-04 : `base` employés dans les unités choisies, puis ce que chaque critère écarte ; `visible` reste."""

    base: int
    base_label: str
    steps: tuple[AudienceStep, ...]
    visible: int


def audience(criteria: Criteria, candidates: list[Candidate], today: date, unit_labels: dict[str, str]) -> Audience:
    """Les critères appliqués l'un après l'autre ; le dernier nombre est celui de `missing` (tous les critères remplis)."""
    pool = [candidate for candidate in candidates if _in_units(candidate, criteria.unit_codes)]
    if criteria.unit_codes:
        base_label = "employés rattachés à " + " ou ".join(unit_labels.get(code, code) for code in criteria.unit_codes)
    else:
        base_label = "employés en activité"
    base = len(pool)

    filters = []
    if criteria.domains:
        filters.append(
            (f"sans certificat validé en {domains_text(criteria.domains)}", lambda c: _has_certificate(c, None, criteria.domains))
        )
    if criteria.min_level:
        level = LEVELS_BY_CODE[criteria.min_level].label
        reason = f"sans certificat de niveau {level} dans ces domaines" if criteria.domains else f"niveau validé inférieur à {level}"
        filters.append((reason, lambda c: _has_certificate(c, criteria.min_level, criteria.domains)))
    for required, where in (
        (criteria.min_years_in_institution, "l'institution"),
        (criteria.min_years_in_position, "le poste"),
    ):
        if required is not None:
            filters.append((f"moins de {_years(required)} d'ancienneté dans {where}", lambda c, r=required: _years_ok(c, r, today)))
    if criteria.min_grade:
        filters.append((f"grade inférieur à {criteria.min_grade}", lambda c: _grade_ok(c, criteria.min_grade)))

    steps = []
    for reason, keep in filters:
        kept = [candidate for candidate in pool if keep(candidate)]
        steps.append(AudienceStep(len(pool) - len(kept), reason))
        pool = kept
    return Audience(base, base_label, tuple(steps), len(pool))
