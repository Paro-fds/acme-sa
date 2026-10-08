from app.shared.domain.errors import Conflict, DomainError, Forbidden, InvalidInput, NotFound, Unauthorized


class IdentityNotRecognized(Unauthorized):
    code = "IDENTITY_NOT_RECOGNIZED"
    message = "Informations non reconnues. Vérifiez votre saisie."


class IdentityAmbiguous(Conflict):
    code = "IDENTITY_AMBIGUOUS"
    message = "Plusieurs dossiers correspondent à vos informations. Contactez l'administration."


class RegistrationRefused(Conflict):
    """US-101 CA-03 : même réponse pour une personne inconnue et pour un mot de passe déjà créé."""

    code = "REGISTRATION_REFUSED"
    message = (
        "Impossible de créer un mot de passe avec ces informations. Vérifiez votre nom et votre date de naissance ; "
        "si vous avez déjà un mot de passe, connectez-vous."
    )


class PasswordTooShort(InvalidInput):
    code = "PASSWORD_TOO_SHORT"
    message = "Le mot de passe doit contenir au moins 8 caractères."


class PasswordMismatch(InvalidInput):
    code = "PASSWORD_MISMATCH"
    message = "Les deux mots de passe ne correspondent pas."


class LoginFailed(Unauthorized):
    """US-101 CA-03 : même réponse pour une personne inconnue ou inactive, un mot de passe faux
    ou jamais créé ; le nombre de tentatives restantes n'est pas donné."""

    code = "INVALID_CREDENTIALS"
    message = "Ces informations ne correspondent pas. Vérifiez votre nom, votre date de naissance et votre mot de passe."


class AccountLocked(DomainError):
    code = "ACCOUNT_LOCKED"
    message = "Trop de tentatives. Réessayez dans 15 minutes."
    http_status = 423

    def __init__(self, retry_after: int | None = None) -> None:
        super().__init__()
        if retry_after is not None:
            self.extra = {"retry_after": retry_after}
            """US-101 CA-06 : secondes avant la fin de la suspension, pour le compte à rebours."""


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


# --- Comptes administrateurs (US-23) ------------------------------------------------


class InvalidUsername(InvalidInput):
    code = "INVALID_USERNAME"
    message = "L'identifiant doit contenir de 3 à 50 caractères : lettres sans accents, chiffres, point, tiret ou trait bas."


class UsernameTaken(Conflict):
    code = "USERNAME_TAKEN"
    message = "Cet identifiant est déjà utilisé."


class AdminPasswordTooShort(InvalidInput):
    code = "PASSWORD_TOO_SHORT"
    message = "Le mot de passe doit contenir au moins 12 caractères."


class WrongCurrentPassword(InvalidInput):
    code = "WRONG_PASSWORD"
    message = "Mot de passe actuel incorrect."


class PasswordUnchanged(InvalidInput):
    code = "PASSWORD_UNCHANGED"
    message = "Choisissez un mot de passe différent de l'actuel."


class PasswordChangeRequired(Forbidden):
    code = "PASSWORD_CHANGE_REQUIRED"
    message = "Choisissez votre mot de passe pour continuer."


class AdminNotFound(NotFound):
    code = "ADMIN_NOT_FOUND"
    message = "Administrateur introuvable."


class CannotDeleteSelf(Conflict):
    code = "CANNOT_DELETE_SELF"
    message = "Vous ne pouvez pas supprimer votre propre compte."


class LastAdmin(Conflict):
    code = "LAST_ADMIN"
    message = "Le dernier administrateur ne peut pas être supprimé."


class AdminAlreadyExists(Conflict):
    code = "ADMIN_ALREADY_EXISTS"
    message = "Un administrateur existe déjà : les suivants s'ajoutent depuis l'écran « Administrateurs »."


# --- Double authentification des comptes RH (US-102) ------------------------------------


class InvalidMfaDestination(InvalidInput):
    code = "INVALID_DESTINATION"
    message = "Saisissez une adresse ou un numéro valide."


class InvalidMfaCode(InvalidInput):
    code = "INVALID_CODE"
    message = "Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau."


class MfaRequired(Unauthorized):
    """Mot de passe vérifié, second facteur pas encore saisi."""

    code = "MFA_REQUIRED"
    message = "Saisissez votre code de vérification pour continuer."


class MfaAlreadyEnrolled(Conflict):
    code = "MFA_ALREADY_ENROLLED"
    message = "Une double authentification est déjà enregistrée : confirmez d'abord avec votre méthode actuelle."


class MfaMethodUnavailable(Conflict):
    """US-102 : méthode fermée sur cet environnement (service d'envoi pas encore choisi, D-41)."""

    code = "MFA_METHOD_UNAVAILABLE"
    message = "Cette méthode n'est pas encore disponible. Choisissez l'application d'authentification."


class MfaNotEnrolled(Conflict):
    code = "MFA_NOT_ENROLLED"
    message = "Choisissez d'abord votre méthode de double authentification."


class NoSetupInProgress(Conflict):
    code = "NO_SETUP_IN_PROGRESS"
    message = "Choisissez à nouveau votre méthode : l'enregistrement a été interrompu."


class CannotResetOwnMfa(Conflict):
    code = "CANNOT_RESET_OWN_MFA"
    message = "Pour changer votre propre méthode, passez par « Ma double authentification »."


class OfficeNetworkOnly(Forbidden):
    code = "OFFICE_NETWORK_ONLY"
    message = "L'espace RH n'est accessible que depuis le réseau des bureaux."
