"""US-102 : double authentification des comptes RH.

Après le mot de passe, la session n'est qu'« en attente du code » (`ADMIN_MFA`) : elle n'ouvre que
le choix de la méthode et la saisie du code. La session RH complète s'ouvre une fois le code vérifié.
Les codes faux comptent comme des mots de passe faux : 5 erreurs suspendent le compte 15 minutes.
"""

from dataclasses import dataclass

from app.auth.application.sessions import SessionService
from app.auth.domain.admin import AdminAccount
from app.auth.domain.errors import (
    AccountLocked,
    AdminNotFound,
    CannotResetOwnMfa,
    InvalidMfaCode,
    MfaAlreadyEnrolled,
    MfaMethodUnavailable,
    MfaNotEnrolled,
    NoSetupInProgress,
    NotAuthenticated,
)
from app.auth.domain.mfa import (
    CHANGE_WINDOW,
    CODE_VALIDITY,
    MfaMethod,
    PendingCode,
    hash_code,
    is_well_formed,
    mask_destination,
    new_code,
    normalize_destination,
)
from app.auth.domain.model import SubjectType
from app.auth.domain.ports import AdminAccountRepository, CodeSender, SecurityLog, TotpService
from app.shared.domain.clock import Clock


@dataclass(frozen=True)
class MfaStatus:
    enrolled: bool
    method: MfaMethod | None
    destination: str | None
    """Destination masquée (« +509 •••• 1111 »)."""
    available: tuple[MfaMethod, ...] = ()
    """Méthodes ouvertes sur cet environnement (`MFA_METHODS`)."""


@dataclass(frozen=True)
class CodeSent:
    method: MfaMethod
    destination: str
    local_code: str | None
    """Poste du développeur et tests seulement : le code, affiché à l'écran à la place d'un envoi."""


@dataclass(frozen=True)
class TotpSetup:
    secret: str
    uri: str
    qr_code: str


@dataclass(frozen=True)
class SetupStarted:
    method: MfaMethod
    code: CodeSent | None
    totp: TotpSetup | None


class MfaCodes:
    """Émission et vérification des codes, partagées par tous les cas d'utilisation de la double authentification."""

    def __init__(
        self,
        admins: AdminAccountRepository,
        sender: CodeSender,
        totp: TotpService,
        log: SecurityLog,
        clock: Clock,
        *,
        show_codes: bool,
        methods: list[MfaMethod],
    ) -> None:
        self.admins = admins
        self._sender = sender
        self._totp = totp
        self.log = log
        self.clock = clock
        self._show_codes = show_codes
        self.methods = tuple(method for method in MfaMethod if method in methods)

    def status(self, admin: AdminAccount) -> MfaStatus:
        destination = mask_destination(admin.mfa_method, admin.mfa_destination)
        return MfaStatus(admin.mfa_enrolled, admin.mfa_method, destination, self.methods)

    def get(self, admin_id: str) -> AdminAccount:
        admin = self.admins.get(admin_id)
        if admin is None:
            raise NotAuthenticated()
        return admin

    def issue(self, admin: AdminAccount, method: MfaMethod, destination: str) -> CodeSent:
        """CA-02 : nouveau code à 6 chiffres, valable quelques minutes ; il remplace le précédent."""
        code = new_code()
        admin.mfa_code = PendingCode(hash_code(code, admin.id), self.clock.now() + CODE_VALIDITY)
        self._sender.send(method, destination, code)
        return CodeSent(method, mask_destination(method, destination), code if self._show_codes else None)

    def check(self, admin: AdminAccount, code: str, method: MfaMethod, secret: str | None, event: str) -> None:
        """Vérifie le code ; un code faux compte comme une erreur de connexion (blocage au 5ᵉ)."""
        now = self.clock.now()
        if admin.is_locked(now):
            raise AccountLocked(admin.seconds_until_unlock(now))
        code = (code or "").strip()
        if method is MfaMethod.TOTP:
            valid = is_well_formed(code) and secret is not None and self._totp.verify(secret, code, now)
        else:
            valid = is_well_formed(code) and admin.mfa_code is not None and admin.mfa_code.matches(code, admin.id, now)
        if valid:
            admin.mfa_code = None  # usage unique
            return
        admin.register_failure(now)
        self.admins.save(admin)
        self.log.record(f"{event}_FAILED", admin.id, method=method.value)
        if admin.is_locked(now):
            raise AccountLocked(admin.seconds_until_unlock(now))
        raise InvalidMfaCode(field="code")

    def start_totp(self, admin: AdminAccount) -> TotpSetup:
        secret = self._totp.new_secret()
        uri = self._totp.provisioning_uri(secret, admin.username)
        return TotpSetup(secret, uri, self._totp.qr_code(uri))


def _complete_login(codes: MfaCodes, sessions: SessionService, admin: AdminAccount) -> str:
    admin.register_success()
    admin.last_login_at = codes.clock.now()
    codes.admins.save(admin)
    sessions.close_all_for(SubjectType.ADMIN_MFA, admin.id)
    codes.log.record("ADMIN_LOGIN_SUCCEEDED", admin.id, method=admin.mfa_method.value)
    return sessions.open(SubjectType.ADMIN, admin.id)


class GetMfaStatus:
    def __init__(self, codes: MfaCodes) -> None:
        self._codes = codes

    def execute(self, admin_id: str) -> MfaStatus:
        return self._codes.status(self._codes.get(admin_id))


class StartMfaSetup:
    """CA-01, CA-03 : choix de la méthode. Rien ne change tant qu'un premier code n'est pas confirmé."""

    def __init__(self, codes: MfaCodes) -> None:
        self._codes = codes

    def execute(self, admin_id: str, method: MfaMethod, destination: str | None) -> SetupStarted:
        admin = self._codes.get(admin_id)
        now = self._codes.clock.now()
        change_allowed = admin.mfa_change_allowed_until is not None and now < admin.mfa_change_allowed_until
        if admin.mfa_enrolled and not change_allowed:
            raise MfaAlreadyEnrolled()
        if method not in self._codes.methods:
            raise MfaMethodUnavailable()
        destination = normalize_destination(method, destination)
        admin.clear_pending_mfa()
        admin.mfa_pending_method = method
        admin.mfa_pending_destination = destination
        code = totp = None
        if method is MfaMethod.TOTP:
            totp = self._codes.start_totp(admin)
            admin.mfa_pending_secret = totp.secret
        else:
            code = self._codes.issue(admin, method, destination)
        self._codes.admins.save(admin)
        return SetupStarted(method, code, totp)


class ConfirmMfaSetup:
    """CA-01 : le premier code reçu (ou lu dans l'application) enregistre la méthode.

    À la première connexion, la session RH s'ouvre alors (`open_session`) ; lors d'un changement (CA-04),
    la session en cours continue.
    """

    def __init__(self, codes: MfaCodes, sessions: SessionService) -> None:
        self._codes = codes
        self._sessions = sessions

    def execute(self, admin_id: str, code: str, *, open_session: bool) -> str | None:
        admin = self._codes.get(admin_id)
        method = admin.mfa_pending_method
        if method is None:
            raise NoSetupInProgress()
        self._codes.check(admin, code, method, admin.mfa_pending_secret, "MFA_SETUP")
        changed = admin.mfa_enrolled
        admin.mfa_method = method
        admin.mfa_secret = admin.mfa_pending_secret
        admin.mfa_destination = admin.mfa_pending_destination
        admin.clear_pending_mfa()
        admin.mfa_change_allowed_until = None
        self._codes.log.record("MFA_CHANGED" if changed else "MFA_ENROLLED", admin.id, method=method.value)
        if open_session:
            return _complete_login(self._codes, self._sessions, admin)
        admin.register_success()
        self._codes.admins.save(admin)
        return None


class SendMfaCode:
    """CA-02 : (r)envoi d'un code à la méthode enregistrée (connexion, confirmation d'un changement)."""

    def __init__(self, codes: MfaCodes) -> None:
        self._codes = codes

    def execute(self, admin_id: str) -> CodeSent:
        admin = self._codes.get(admin_id)
        if not admin.mfa_enrolled or not admin.mfa_method.sends_code:
            raise MfaNotEnrolled("Votre méthode ne reçoit pas de code : ouvrez votre application d'authentification.")
        sent = self._codes.issue(admin, admin.mfa_method, admin.mfa_destination)
        self._codes.admins.save(admin)
        return sent


class VerifyMfa:
    """Connexion RH, deuxième étape : le code de la méthode enregistrée ouvre la session complète."""

    def __init__(self, codes: MfaCodes, sessions: SessionService) -> None:
        self._codes = codes
        self._sessions = sessions

    def execute(self, admin_id: str, code: str) -> str:
        admin = self._codes.get(admin_id)
        if not admin.mfa_enrolled:
            raise MfaNotEnrolled()
        self._codes.check(admin, code, admin.mfa_method, admin.mfa_secret, "ADMIN_LOGIN")
        return _complete_login(self._codes, self._sessions, admin)


class ConfirmMfaChange:
    """CA-04 : confirmation avec la méthode actuelle avant d'en choisir une autre."""

    def __init__(self, codes: MfaCodes) -> None:
        self._codes = codes

    def execute(self, admin_id: str, code: str) -> None:
        admin = self._codes.get(admin_id)
        if not admin.mfa_enrolled:
            raise MfaNotEnrolled()
        self._codes.check(admin, code, admin.mfa_method, admin.mfa_secret, "MFA_CHANGE")
        admin.register_success()
        admin.mfa_change_allowed_until = self._codes.clock.now() + CHANGE_WINDOW
        self._codes.admins.save(admin)
        self._codes.log.record("MFA_CHANGE_CONFIRMED", admin.id, method=admin.mfa_method.value)


class ResetAdminMfa:
    """CA-05 : téléphone perdu ; un autre compte RH efface la méthode et ferme les sessions de la personne."""

    def __init__(self, codes: MfaCodes, sessions: SessionService) -> None:
        self._codes = codes
        self._sessions = sessions

    def execute(self, actor_id: str, target_id: str) -> None:
        target = self._codes.admins.get(target_id)
        if target is None:
            raise AdminNotFound()
        if target_id == actor_id:
            raise CannotResetOwnMfa()
        target.reset_mfa()
        self._codes.admins.save(target)
        self._sessions.close_all_for(SubjectType.ADMIN, target.id)
        self._codes.log.record("MFA_RESET", target.id, by=actor_id)
