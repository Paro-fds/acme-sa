from app.shared.domain.errors import Conflict, InvalidInput, NotFound


class InvalidOpeningField(InvalidInput):
    code = "INVALID_OPENING_FIELD"


class OpeningNotFound(NotFound):
    code = "OPENING_NOT_FOUND"
    message = "Poste introuvable."


class JobProfileNotFound(NotFound):
    """US-119 : fiche absente du catalogue des postes ACME."""

    code = "JOB_PROFILE_NOT_FOUND"
    message = "Fiche de poste introuvable."


class OpeningCodeTaken(Conflict):
    code = "OPENING_CODE_TAKEN"
    message = "Ce code est déjà utilisé par un autre poste."

    def __init__(self) -> None:
        super().__init__(field="code")


class OpeningTransitionRefused(Conflict):
    code = "OPENING_TRANSITION_REFUSED"


class OpeningLocked(Conflict):
    code = "OPENING_LOCKED"
    message = "Un poste clôturé ou pourvu ne se modifie plus."


# --- US-902 : candidatures ----------------------------------------------------------------


class InvalidApplicationField(InvalidInput):
    code = "INVALID_APPLICATION_FIELD"


class ApplicationNotFound(NotFound):
    code = "APPLICATION_NOT_FOUND"
    message = "Candidature introuvable."


class ApplicationClosed(Conflict):
    code = "APPLICATION_CLOSED"
    message = "Cette candidature est clôturée."


class StepRefused(Conflict):
    code = "STEP_REFUSED"


class OpeningNotOpen(Conflict):
    code = "OPENING_NOT_OPEN"
    message = "Ce poste n'est plus ouvert aux candidatures."


class NotEligible(Conflict):
    code = "NOT_ELIGIBLE"
    message = "Vous ne remplissez pas encore les critères de ce poste."


class AlreadyApplied(Conflict):
    code = "ALREADY_APPLIED"
    message = "Vous avez déjà une candidature en cours pour ce poste."


class ProfileIncomplete(Conflict):
    code = "PROFILE_INCOMPLETE"
    message = "Complétez votre profil avant de postuler."
