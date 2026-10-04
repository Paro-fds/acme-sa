from app.shared.domain.errors import Conflict, DomainError, Forbidden, InvalidInput, Unauthorized


class IdentityNotRecognized(Unauthorized):
    code = "IDENTITY_NOT_RECOGNIZED"
    message = "Informations non reconnues. Vérifiez votre saisie."


class IdentityAmbiguous(Conflict):
    code = "IDENTITY_AMBIGUOUS"
    message = "Plusieurs dossiers correspondent à vos informations. Contactez l'administration."


class AccountAlreadyExists(Conflict):
    code = "ACCOUNT_ALREADY_EXISTS"
    message = "Un mot de passe existe déjà pour ce dossier. Connectez-vous avec votre mot de passe."


class PasswordNotSet(Conflict):
    code = "PASSWORD_NOT_SET"
    message = "Vous n'avez pas encore créé de mot de passe."


class PasswordTooShort(InvalidInput):
    code = "PASSWORD_TOO_SHORT"
    message = "Le mot de passe doit contenir au moins 8 caractères."


class PasswordMismatch(InvalidInput):
    code = "PASSWORD_MISMATCH"
    message = "Les deux mots de passe ne correspondent pas."


class InvalidCredentials(Unauthorized):
    code = "INVALID_CREDENTIALS"
    message = "Mot de passe incorrect."


def invalid_credentials(remaining_attempts: int, show_remaining: bool) -> InvalidCredentials:
    if not show_remaining:
        return InvalidCredentials(field="password")
    plural = "s" if remaining_attempts > 1 else ""
    return InvalidCredentials(
        f"Mot de passe incorrect. Il vous reste {remaining_attempts} tentative{plural}.",
        field="password",
    )


class AccountLocked(DomainError):
    code = "ACCOUNT_LOCKED"
    message = "Trop de tentatives. Réessayez dans 15 minutes."
    http_status = 423


class InvalidAdminCredentials(Unauthorized):
    code = "INVALID_CREDENTIALS"
    message = "Identifiant ou mot de passe incorrect."


class NotAuthenticated(Unauthorized):
    code = "NOT_AUTHENTICATED"
    message = "Vous devez être connecté."


class SessionExpired(Unauthorized):
    code = "SESSION_EXPIRED"
    message = "Votre session a expiré. Reconnectez-vous."


class AdminOnly(Forbidden):
    code = "ADMIN_ONLY"
    message = "Accès réservé à l'administration."
