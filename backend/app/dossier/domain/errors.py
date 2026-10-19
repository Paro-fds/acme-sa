from app.shared.domain.errors import Forbidden, InvalidInput, NotFound


class InvalidDossierField(InvalidInput):
    """US-202 CA-02 : le message dit quoi faire (RG-15) et désigne le champ."""

    code = "INVALID_FIELD"


class ConsentRequired(Forbidden):
    code = "CONSENT_REQUIRED"
    message = "Lisez la mention d'information et donnez votre accord avant de compléter votre dossier."


class NoticeNotAccepted(InvalidInput):
    code = "NOTICE_NOT_ACCEPTED"
    message = "Cochez la case « J'ai lu et j'accepte » pour continuer."

    def __init__(self) -> None:
        super().__init__(field="information_notice")


class UnknownHrInformation(NotFound):
    code = "UNKNOWN_HR_INFORMATION"
    message = "Cette information ne fait pas partie de celles à confirmer."
