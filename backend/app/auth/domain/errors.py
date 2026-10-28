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


# --- US-1003 : connexion des employés par code à usage unique ------------------------------------


class LoginRefused(Unauthorized):
    """Doc PAM : un seul message, que le code employé existe ou non, que la date soit fausse ou non."""

    code = "INVALID_CREDENTIALS"
    message = "Informations incorrectes."

    def __init__(self, captcha: str | None = None) -> None:
        super().__init__()
        if captcha:
            self.extra = {"captcha": captcha}
            """US-1015 : question à résoudre au prochain essai, à partir de 3 échecs."""


class LoginLocked(AccountLocked):
    message = "Trop de tentatives : votre accès est verrouillé pour un moment."


class ContactHr(Conflict):
    code = "CONTACT_HR"
    message = "Aucun courriel n'est enregistré à votre dossier. Contactez la DRH."

    @classmethod
    def no_whatsapp(cls) -> "ContactHr":
        return cls("Aucun numéro WhatsApp n'est enregistré à votre dossier. Contactez la DRH.")

    @classmethod
    def recently_changed(cls) -> "ContactHr":
        """US-1005 : contact modifié il y a moins de 72 heures."""
        return cls("Ce contact a été modifié il y a moins de 72 heures. Contactez la DRH.")


class WhatsAppQuotaReached(DomainError):
    """US-1004 : 5 messages WhatsApp par mois civil, renvois compris."""

    code = "WHATSAPP_QUOTA_REACHED"
    message = "Vous avez reçu 5 codes par WhatsApp ce mois-ci. Choisissez le courriel, ou contactez la DRH."
    http_status = 429


class ResendTooSoon(DomainError):
    code = "CODE_RESEND_TOO_SOON"
    message = "Attendez un peu avant de demander un nouveau code."
    http_status = 429

    def __init__(self, retry_after: int) -> None:
        super().__init__()
        self.extra = {"retry_after": retry_after}


class TooManyCodes(ResendTooSoon):
    code = "TOO_MANY_CODES"
    message = "Trop de codes demandés. Réessayez dans quelques minutes."


class InvalidLoginCode(InvalidInput):
    """US-1016 (modèle du directeur) : code faux, expiré, déjà utilisé ou brûlé, toujours le même texte,
    sans le nombre d'essais restants."""

    code = "INVALID_CODE"
    message = "Code incorrect ou expiré."

    def __init__(self) -> None:
        super().__init__(field="code")


class LoginCodeExpired(InvalidLoginCode):
    pass


class LoginResendTooSoon(ResendTooSoon):
    message = "Veuillez patienter avant un nouvel envoi."


class LoginResendLimit(TooManyCodes):
    message = "Le nombre de renvois est atteint. Réessayez plus tard."


class LoginUnavailable(DomainError):
    code = "LOGIN_UNAVAILABLE"
    message = "La connexion est momentanément impossible. Réessayez plus tard ou contactez la DRH."
    http_status = 503


class WhatsAppUnavailable(LoginUnavailable):
    """US-1018 : WhatsApp n'est pas encore configuré (modèle Meta et jeton) ; rien n'est envoyé."""

    message = "WhatsApp est indisponible."


class CodeEmailNotSent(LoginUnavailable):
    """US-1016 : le courriel du code n'est pas parti (modèle du directeur)."""

    message = "Le courriel n'a pas pu être envoyé. Contactez la DIT."


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


class InsufficientRole(Forbidden):
    code = "INSUFFICIENT_ROLE"
    message = "Action non autorisée pour votre rôle."


class LastAdminRole(Conflict):
    code = "LAST_ADMIN"
    message = "Le dernier administrateur ne peut pas changer de rôle."


class InvalidRole(InvalidInput):
    code = "INVALID_ROLE"
    message = "Rôle administrateur non reconnu."


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


class AccountDisabled(Forbidden):
    code = "ACCOUNT_DISABLED"
    message = "Ce compte a été désactivé."


class CannotDeactivateSelf(Conflict):
    code = "CANNOT_DEACTIVATE_SELF"
    message = "Vous ne pouvez pas désactiver votre propre compte."


class LastAdminActive(Conflict):
    code = "LAST_ADMIN_ACTIVE"
    message = "Le dernier administrateur actif ne peut pas être désactivé."


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
