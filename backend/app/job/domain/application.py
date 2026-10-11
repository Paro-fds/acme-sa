"""US-902 (choix du 2026-10-11) : candidature d'un employé à un poste publié.

- Circuit en 7 étapes (EF-902, Q6 §3) : réception et enregistrement → étude par la DRH → consultation du responsable
  du département → évaluation si nécessaire → décision de la DRH → approbation de la Direction Générale → clôture
  (acceptée, refusée, reportée ou retirée).
- Les RH avancent vers une étape suivante (l'évaluation peut être sautée) ou clôturent ; l'employé peut retirer sa
  candidature tant qu'elle n'est pas clôturée. Aucune candidature n'est supprimée (RG-74).
- Accusé de réception immédiat : la candidature est « Reçue et enregistrée » dès l'envoi (RG-73 : 2 jours ouvrables au plus).
- Fiche de demande (Q6 §4) : CV facultatif (PDF, JPG ou PNG, comme les certificats) et profil de l'employé au moment
  de la candidature, figé (il ne change plus si le dossier change ensuite).
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from app.job.domain.errors import ApplicationClosed, InvalidApplicationField, StepRefused
from app.job.domain.opening import Actor

MOTIVATION_MAX = 2000


class ApplicationStep(StrEnum):
    RECEIVED = "RECEIVED"
    DRH_REVIEW = "DRH_REVIEW"
    MANAGER = "MANAGER"
    EVALUATION = "EVALUATION"
    DRH_DECISION = "DRH_DECISION"
    DG_APPROVAL = "DG_APPROVAL"
    CLOSED = "CLOSED"

    @property
    def label(self) -> str:
        return _STEP_LABELS[self]

    @property
    def number(self) -> int:
        return list(ApplicationStep).index(self) + 1


_STEP_LABELS = {
    ApplicationStep.RECEIVED: "Reçue et enregistrée",
    ApplicationStep.DRH_REVIEW: "Étude par la DRH",
    ApplicationStep.MANAGER: "Consultation du responsable du département",
    ApplicationStep.EVALUATION: "Évaluation",
    ApplicationStep.DRH_DECISION: "Décision de la DRH",
    ApplicationStep.DG_APPROVAL: "Approbation de la Direction Générale",
    ApplicationStep.CLOSED: "Clôturée",
}


class Outcome(StrEnum):
    ACCEPTED = "ACCEPTED"
    REFUSED = "REFUSED"
    POSTPONED = "POSTPONED"
    WITHDRAWN = "WITHDRAWN"

    @property
    def label(self) -> str:
        return _OUTCOME_LABELS[self]


_OUTCOME_LABELS = {
    Outcome.ACCEPTED: "Acceptée",
    Outcome.REFUSED: "Refusée",
    Outcome.POSTPONED: "Reportée",
    Outcome.WITHDRAWN: "Retirée",
}

RH_OUTCOMES = (Outcome.ACCEPTED, Outcome.REFUSED, Outcome.POSTPONED)
"""Retirée : seul l'employé retire sa candidature."""


@dataclass(frozen=True)
class CvFile:
    """CV joint à la candidature, dans le stockage privé des certificats."""

    key: str
    name: str
    content_type: str
    size_bytes: int


@dataclass(frozen=True)
class ApplicationStepChange:
    step: ApplicationStep
    at: datetime
    actor: Actor
    outcome: Outcome | None = None


def clean_motivation(raw: str | None) -> str:
    """Motivation facultative, 2000 caractères au plus."""
    value = (raw or "").strip()
    if len(value) > MOTIVATION_MAX:
        raise InvalidApplicationField(
            f"Raccourcissez votre message : {MOTIVATION_MAX} caractères au plus.", field="motivation"
        )
    return value


@dataclass
class JobApplication:
    id: int | None
    opening_id: int
    employee_id: str
    motivation: str
    received_at: datetime
    step: ApplicationStep
    outcome: Outcome | None = None
    history: list[ApplicationStepChange] = field(default_factory=list)
    cv: CvFile | None = None
    profile_snapshot: tuple[str, ...] = ()

    @classmethod
    def submit(
        cls,
        opening_id: int,
        employee_id: str,
        motivation: str,
        actor: Actor,
        at: datetime,
        cv: CvFile | None = None,
        profile_snapshot: tuple[str, ...] = (),
    ) -> "JobApplication":
        application = cls(
            None, opening_id, employee_id, clean_motivation(motivation), at, ApplicationStep.RECEIVED,
            cv=cv, profile_snapshot=profile_snapshot,
        )
        application.history.append(ApplicationStepChange(ApplicationStep.RECEIVED, at, actor))
        return application

    @property
    def reference(self) -> str:
        """Numéro de suivi donné avec l'accusé de réception."""
        return f"CAND-{self.id:05d}"

    @property
    def closed(self) -> bool:
        return self.step is ApplicationStep.CLOSED

    def next_steps(self) -> list[ApplicationStep]:
        """Étapes vers lesquelles les RH peuvent avancer (hors clôture, qui a sa propre action)."""
        if self.closed:
            return []
        steps = list(ApplicationStep)
        return steps[steps.index(self.step) + 1 : -1]

    def move_to(self, step: ApplicationStep, actor: Actor, at: datetime) -> None:
        self._open()
        if step not in self.next_steps():
            raise StepRefused("Choisissez une étape qui suit l'étape en cours.")
        self.step = step
        self.history.append(ApplicationStepChange(step, at, actor))

    def close(self, outcome: Outcome, actor: Actor, at: datetime) -> None:
        self._open()
        if outcome not in RH_OUTCOMES:
            raise StepRefused("Clôturez avec une suite : acceptée, refusée ou reportée.")
        self._close(outcome, actor, at)

    def withdraw(self, actor: Actor, at: datetime) -> None:
        self._open()
        self._close(Outcome.WITHDRAWN, actor, at)

    def _open(self) -> None:
        if self.closed:
            raise ApplicationClosed()

    def _close(self, outcome: Outcome, actor: Actor, at: datetime) -> None:
        self.step = ApplicationStep.CLOSED
        self.outcome = outcome
        self.history.append(ApplicationStepChange(ApplicationStep.CLOSED, at, actor, outcome))
