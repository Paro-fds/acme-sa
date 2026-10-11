"""US-902 (choix du 2026-10-11) : une candidature à un poste suit le circuit en 7 étapes (EF-902) ; jamais supprimée."""

from datetime import UTC, datetime

import pytest

from app.job.domain.application import ApplicationStep, JobApplication, Outcome
from app.job.domain.errors import ApplicationClosed, StepRefused
from app.job.domain.opening import Actor

EMPLOYEE = Actor("1001", "Jean JOSEPH")
AGENT = Actor("agent-1", "Agent RH Démo")
T0 = datetime(2026, 10, 4, 9, 0, tzinfo=UTC)
T1 = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)


def _application() -> JobApplication:
    return JobApplication.submit(7, "1001", "Je souhaite évoluer.", EMPLOYEE, T0)


def test_une_candidature_deposee_est_recue_et_enregistree():
    application = _application()
    assert application.step is ApplicationStep.RECEIVED
    assert application.outcome is None
    assert application.received_at == T0
    assert [(s.step, s.at, s.actor) for s in application.history] == [(ApplicationStep.RECEIVED, T0, EMPLOYEE)]


def test_les_etapes_du_circuit():
    assert [step.label for step in ApplicationStep] == [
        "Reçue et enregistrée",
        "Étude par la DRH",
        "Consultation du responsable du département",
        "Évaluation",
        "Décision de la DRH",
        "Approbation de la Direction Générale",
        "Clôturée",
    ]
    assert [outcome.label for outcome in Outcome] == ["Acceptée", "Refusée", "Reportée", "Retirée"]


def test_les_rh_font_avancer_la_candidature():
    application = _application()
    application.move_to(ApplicationStep.DRH_REVIEW, AGENT, T1)
    application.move_to(ApplicationStep.MANAGER, AGENT, T1)
    assert application.step is ApplicationStep.MANAGER
    assert application.history[-1].actor == AGENT


def test_l_evaluation_peut_etre_sautee():
    application = _application()
    application.move_to(ApplicationStep.MANAGER, AGENT, T1)
    application.move_to(ApplicationStep.DRH_DECISION, AGENT, T1)
    assert application.step is ApplicationStep.DRH_DECISION


@pytest.mark.parametrize("target", [ApplicationStep.RECEIVED, ApplicationStep.CLOSED])
def test_on_n_avance_que_vers_une_etape_suivante_hors_cloture(target):
    application = _application()
    with pytest.raises(StepRefused):
        application.move_to(target, AGENT, T1)


def test_les_rh_cloturent_avec_une_suite():
    application = _application()
    application.close(Outcome.ACCEPTED, AGENT, T1)
    assert application.step is ApplicationStep.CLOSED
    assert application.outcome is Outcome.ACCEPTED
    assert application.history[-1].outcome is Outcome.ACCEPTED


def test_les_rh_ne_retirent_pas_une_candidature_a_la_place_de_l_employe():
    with pytest.raises(StepRefused):
        _application().close(Outcome.WITHDRAWN, AGENT, T1)


def test_l_employe_retire_sa_candidature_tant_qu_elle_n_est_pas_cloturee():
    application = _application()
    application.withdraw(EMPLOYEE, T1)
    assert (application.step, application.outcome) == (ApplicationStep.CLOSED, Outcome.WITHDRAWN)
    with pytest.raises(ApplicationClosed):
        application.withdraw(EMPLOYEE, T1)
    with pytest.raises(ApplicationClosed):
        application.move_to(ApplicationStep.DRH_REVIEW, AGENT, T1)


def test_le_numero_de_suivi():
    application = _application()
    application.id = 42
    assert application.reference == "CAND-00042"
