from app.shared.domain.errors import Conflict, InvalidInput


class UpdateAlreadySubmitted(Conflict):
    code = "UPDATE_ALREADY_SUBMITTED"
    message = "Votre mise à jour a déjà été envoyée : touchez « Modifier à nouveau » pour la corriger."


class UpdateNotSubmitted(Conflict):
    code = "UPDATE_NOT_SUBMITTED"
    message = "Votre mise à jour n'a pas encore été envoyée : vous pouvez la modifier directement."


class NoReopenedUpdate(Conflict):
    code = "NO_REOPENED_UPDATE"
    message = "Aucune modification en cours à annuler."


class UpdateNotStarted(Conflict):
    code = "UPDATE_NOT_STARTED"
    message = "Indiquez d'abord que vous souhaitez mettre à jour votre dossier."


class InvalidField(InvalidInput):
    code = "INVALID_FIELD"


class FieldNotEditable(InvalidInput):
    code = "FIELD_NOT_EDITABLE"
    message = "Cette information ne peut pas être modifiée depuis le portail."


class ConfirmationRequired(InvalidInput):
    code = "CONFIRMATION_REQUIRED"
    message = "Cochez la case pour confirmer que les informations fournies sont exactes."
