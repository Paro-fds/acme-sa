"""US-1003 : connexion des employés en deux facteurs (doc PAM).

1. `IdentifyEmployee` : code employé et date de naissance, simple identifiant. Réussite : session
   « d'identification » (`EMPLOYEE_LOGIN`), qui n'ouvre que l'envoi et la saisie du code.
2. `SendLoginCode` : code à 6 chiffres envoyé au courriel de Vault, jamais à une autre adresse.
3. `VerifyLoginCode` : code juste, la session employé s'ouvre.

US-1015 : les échecs de l'identification comptent par code et par adresse IP (`LoginGuard`) ; un code faux
ne verrouille pas, il brûle le code après 3 erreurs (modèle d'authentification du directeur).
US-1005 : un contact changé dans Vault ne reçoit pas de code pendant 72 heures (`ContactWatch`).
"""

import logging
from dataclasses import dataclass
from html import escape
from datetime import datetime

from app.auth.application.sessions import SessionService, hash_token
from app.auth.domain.errors import (
    ContactHr,
    InvalidLoginCode,
    InvalidMfaDestination,
    CodeEmailNotSent,
    LoginCodeExpired,
    LoginRefused,
    LoginUnavailable,
    NotAuthenticated,
    WhatsAppUnavailable,
)
from app.auth.domain.birth_date import same_birth_date, typed_birth_date
from app.auth.domain.contacts import SeenContact
from app.auth.domain.login_lock import (
    CAPTCHA_AFTER,
    UNKNOWN_CODE,
    Captcha,
    LoginLock,
    code_key,
    ip_key,
    lock_duration,
    typed_code,
)
from app.auth.domain.login_code import (
    RESEND_GAP,
    LoginChannel,
    LoginCode,
    hash_login_code,
    new_login_code,
)
from app.auth.domain.logins import EmployeeLogin, LoginJournal
from app.auth.domain.mfa import CODE_VALIDITY, MfaMethod, mask_destination, normalize_destination
from app.auth.domain.model import SubjectType
from app.auth.domain.ports import (
    CaptchaRepository,
    EmailSender,
    LoginCodeRepository,
    LoginLockRepository,
    MessageNotSent,
    SeenContactRepository,
    WhatsAppQuotaRepository,
    WhatsAppSender,
)
from app.auth.domain.whatsapp import WhatsAppQuota, month_of, whatsapp_number
from app.employee.domain.employee import Employee
from app.employee.domain.repository import EmployeeRepository
from app.shared.domain.clock import Clock

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChannelOption:
    channel: LoginChannel
    destination: str | None
    """Courriel ou numéro masqué (« j•••@exemple.test », « +509 •••• 1111 ») ; vide s'il n'y en a pas."""
    available: bool
    remaining: int | None = None
    """US-1004 : messages WhatsApp qui restent ce mois-ci (sur 5) ; rien pour le courriel."""
    recently_changed: bool = False
    """US-1005 : contact modifié il y a moins de 72 heures."""
    unavailable: bool = False
    """US-1018 : canal pas encore ouvert (WhatsApp sans modèle Meta ni jeton) : « Indisponible »."""


@dataclass(frozen=True)
class Identified:
    token: str
    channels: tuple[ChannelOption, ...]


@dataclass(frozen=True)
class LoginCodeSent:
    channel: LoginChannel
    destination: str
    expires_in: int
    resend_in: int
    local_code: str | None
    """Poste du développeur et tests seulement : le code, affiché à l'écran au lieu d'un envoi."""
    remaining: int | None = None
    """US-1004 : messages WhatsApp qui restent ce mois-ci, après cet envoi."""


def _email_of(employee: Employee) -> str | None:
    """Courriel de Vault, s'il est utilisable."""
    try:
        return normalize_destination(MfaMethod.EMAIL, employee.email_address)
    except InvalidMfaDestination:
        return None



CODE_SUBJECT = "ACME SA — Code de vérification PAM"
NOTICE_SUBJECT = "ACME SA — PAM"
# US-1025 : textes des avis du directeur (`noyau.py`, version du 2026-10-29)
CONSULTATION_NOTICE = (
    "Une consultation de vos documents de paie vient d'avoir lieu. Si vous n'êtes pas à l'origine de cette "
    "connexion, contactez la DRH."
)
REFUSED_NOTICE = "Des essais de consultation ont été refusés. Si vous n'êtes pas à l'origine de ces essais, contactez la DRH."
EMAIL_CHANGED_NOTICE = (
    "Votre adresse du profil RH a changé. Le nouveau contact ne recevra pas de code pendant 72 heures. "
    "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH."
)
HOLD_LIFTED_NOTICE = "La DRH a levé le gel de votre accès à PAM. Vous pouvez demander un code de vérification."
PHONE_CHANGED_NOTICE = (
    "Votre numéro du profil RH a changé. L'ancien numéro ne sert plus à recevoir de code. "
    "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH."
)


def greeting_name(first_name: str | None) -> str:
    """Prénom de la salutation ; un prénom tout en capitales est remis en casse de titre (modèle du directeur)."""
    name = " ".join((first_name or "").split())
    return name.title() if name.isupper() else name


class LoginMessages:
    """Textes des courriels (modèle du directeur) : ni lien, ni code employé, ni nom complet.

    Le code part en HTML (`pam_otp_email.html`, sujet « ACME SA — Code de vérification PAM ») avec une partie texte ;
    les avis de sécurité aussi (US-1025 : `pam_alerte_email.html`, sujet « ACME SA — PAM »).
    """

    def __init__(self, sender: EmailSender, code_template: str = "", alert_template: str = "") -> None:
        self._sender = sender
        self._template = code_template
        self._alert_template = alert_template

    def code_email(self, first_name: str | None, code: str, year: int) -> tuple[str, str, str | None]:
        """(sujet, texte, HTML) du courriel du code."""
        minutes = int(CODE_VALIDITY.total_seconds() // 60)
        name = greeting_name(first_name)
        hello = f"Bonjour {name}," if name else "Bonjour,"
        text = (
            f"{hello}\n\n"
            "Voici votre code de vérification pour vous connecter à la plateforme PAM :\n\n"
            f"{code}\n\n"
            f"Ce code est valable {minutes} minutes et ne peut être utilisé qu'une seule fois.\n\n"
            "1. Retournez sur la page de connexion de PAM.\n"
            "2. Saisissez le code ci-dessus dans le champ prévu.\n"
            "3. Validez pour accéder à votre espace.\n\n"
            "Ne communiquez jamais ce code, à personne, y compris à un collègue ou à un membre de la DIT. "
            "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et contactez la DRH.\n\n"
            "Ceci est un message automatique, merci de ne pas y répondre.\n"
            "Pour toute assistance, contactez la Direction des Ressources Humaines.\n"
            f"© {year} ACME SA — Tous droits réservés.\n"
        )
        html = None
        if self._template:
            html = (
                self._template.replace("Bonjour {{PRENOM}},", f"Bonjour {escape(name)}," if name else "Bonjour,")
                .replace("{{PRENOM}}", escape(name))
                .replace("{{CODE}}", code)
                .replace("{{VALIDITE}}", str(minutes))
                .replace("{{ANNEE}}", str(year))
            )
        return CODE_SUBJECT, text, html

    def login_succeeded(self, email: str | None, first_name: str | None, at: datetime) -> None:
        self._notify(email, first_name, CONSULTATION_NOTICE, at)

    def attempts_refused(self, email: str | None, first_name: str | None, at: datetime) -> None:
        """US-1015 : à partir de 5 échecs pour ce code (modèle du directeur)."""
        self._notify(email, first_name, REFUSED_NOTICE, at)

    def contact_changed(self, email: str | None, first_name: str | None, channel: LoginChannel, at: datetime) -> None:
        self._notify(email, first_name, EMAIL_CHANGED_NOTICE if channel is LoginChannel.EMAIL else PHONE_CHANGED_NOTICE, at)

    def hold_lifted(self, email: str | None, first_name: str | None, at: datetime) -> None:
        """US-1026 : la DRH a levé le gel de 72 heures (`main_levee` du directeur)."""
        self._notify(email, first_name, HOLD_LIFTED_NOTICE, at)

    def notice(self, first_name: str | None, message: str, year: int) -> tuple[str, str | None]:
        """US-1025 : (texte, HTML) d'un avis, comme `rendre_courriel_alerte` du directeur."""
        name = greeting_name(first_name)
        hello = f"Bonjour {name}," if name else "Bonjour,"
        message = " ".join(message.split())
        html = None
        if self._alert_template:
            html = (
                self._alert_template.replace("{{SALUTATION}}", escape(hello))
                .replace("{{MESSAGE}}", escape(message))
                .replace("{{APERCU}}", escape(message))
                .replace("{{ANNEE}}", str(year))
            )
        return f"{hello}\n\n{message}\n", html

    def _notify(self, email: str | None, first_name: str | None, message: str, at: datetime) -> None:
        """Avertissement de sécurité : un échec d'envoi n'empêche ni la connexion, ni le verrouillage, ni le gel."""
        if not email:
            return
        text, html = self.notice(first_name, message, at.year)
        try:
            self._sender.send(email, NOTICE_SUBJECT, text, html=html)
        except MessageNotSent:
            logger.warning("Avertissement de sécurité non envoyé.")


class LoginGuard:
    """US-1015 : verrous par code employé tapé et par adresse IP, calcul à résoudre à partir de 3 échecs."""

    def __init__(self, locks: LoginLockRepository, captchas: CaptchaRepository, messages: LoginMessages) -> None:
        self._locks = locks
        self._captchas = captchas
        self._messages = messages

    def load(self, code: str, ip: str) -> tuple[LoginLock, LoginLock]:
        return tuple(self._locks.get(key) or LoginLock(key) for key in (code_key(code), ip_key(ip)))

    def unlock(self, code: str) -> None:
        """Déblocage par l'administration (US-1003, « Débloquer l'accès ») : le compteur du code repart à zéro."""
        lock = self._locks.get(code_key(code))
        if lock is not None:
            lock.reset()
            self._locks.save(lock)

    def is_locked(self, code: str, now: datetime) -> bool:
        lock = self._locks.get(code_key(code))
        return lock is not None and lock.is_locked(now)

    @staticmethod
    def _captcha_required(locks: tuple[LoginLock, LoginLock]) -> bool:
        return any(lock.failures >= CAPTCHA_AFTER for lock in locks)

    def refusal(self, locks: tuple[LoginLock, LoginLock], code: str, ip: str) -> LoginRefused:
        if not self._captcha_required(locks):
            return LoginRefused()
        key = f"{ip}|{code}"
        captcha = self._captchas.get(key)
        if captcha is None:
            captcha = Captcha.draw(key)
            self._captchas.save(captcha)
        return LoginRefused(captcha.question)

    def captcha_passed(self, locks: tuple[LoginLock, LoginLock], code: str, ip: str, answer: str | None) -> bool:
        if not self._captcha_required(locks):
            return True
        captcha = self._captchas.get(f"{ip}|{code}")
        return captcha is not None and captcha.accepts(answer)

    def fail(self, locks: tuple[LoginLock, LoginLock], employee: Employee | None, now: datetime) -> None:
        for lock in locks:
            lock.register_failure(now)
            self._locks.save(lock)
        if employee is not None and lock_duration(locks[0].failures) is not None:
            self._messages.attempts_refused(_email_of(employee), employee.first_name, now)

    def succeed(self, locks: tuple[LoginLock, LoginLock]) -> None:
        for lock in locks:
            if lock.failures or lock.locked_until:
                lock.reset()
                self._locks.save(lock)


class ContactWatch:
    """US-1005 : compare le contact de Vault au dernier contact vu ; un changement part en avertissement.

    L'avertissement va par courriel seulement (modèle du directeur) : à l'ancienne adresse si le courriel a changé,
    à l'adresse actuelle si c'est le numéro.
    """

    def __init__(self, contacts: SeenContactRepository, messages: LoginMessages) -> None:
        self._contacts = contacts
        self._messages = messages

    def is_held(self, employee: Employee, channel: LoginChannel, value: str | None, now: datetime) -> bool:
        seen = self._contacts.get(employee.id, channel)
        if seen is None:  # premier contact vu : pas bloqué
            self._contacts.save(SeenContact(employee.id, channel, value))
            return False
        previous = seen.value
        if seen.observe(value, now):
            self._contacts.save(seen)
            if value is not None:
                self._alert(employee, channel, previous, now)
        return seen.is_held(now)

    def _alert(self, employee: Employee, channel: LoginChannel, previous: str | None, now: datetime) -> None:
        email = previous if channel is LoginChannel.EMAIL else _email_of(employee)
        self._messages.contact_changed(email, employee.first_name, channel, now)


def _quota(quotas: WhatsAppQuotaRepository, employee_id: str, now: datetime) -> WhatsAppQuota:
    month = month_of(now)
    return quotas.get(employee_id, month) or WhatsAppQuota(employee_id, month)


class IdentifyEmployee:
    def __init__(
        self,
        employees: EmployeeRepository,
        guard: LoginGuard,
        sessions: SessionService,
        clock: Clock,
        messages: LoginMessages,
        quotas: WhatsAppQuotaRepository,
        watch: ContactWatch,
        whatsapp: WhatsAppSender,
    ) -> None:
        self._whatsapp = whatsapp
        self._employees = employees
        self._guard = guard
        self._sessions = sessions
        self._clock = clock
        self._messages = messages
        self._quotas = quotas
        self._watch = watch

    def execute(self, employee_code: str, birth_date: str, ip: str = "", captcha: str | None = None) -> Identified:
        """`birth_date` : la saisie de l'écran, huit chiffres JJMMAAAA (US-1014) ; `ip` : l'adresse vue par le
        serveur, jamais un champ du formulaire ; `captcha` : la réponse au calcul, à partir de 3 échecs (US-1015).

        Code inconnu, compte inactif, date fausse, calcul faux ou verrou : toujours « Informations incorrectes. »
        """
        code = typed_code(employee_code)
        employee = None
        if code != UNKNOWN_CODE:
            employee = next((e for e in self._employees.list_all() if e.employee_code.upper() == code), None)
        now = self._clock.now()
        locks = self._guard.load(code, ip)
        if any(lock.is_locked(now) for lock in locks):  # le compteur n'augmente plus
            raise self._guard.refusal(locks, code, ip)
        right = employee is not None and same_birth_date(employee.birth_date, typed_birth_date(birth_date))
        if not right or not self._guard.captcha_passed(locks, code, ip, captcha):
            self._guard.fail(locks, employee, now)
            raise self._guard.refusal(locks, code, ip)
        self._guard.succeed(locks)

        email = _email_of(employee)
        number = whatsapp_number(employee.telephone_number)
        quota = _quota(self._quotas, employee.id, now)
        email_held = self._watch.is_held(employee, LoginChannel.EMAIL, email, now)
        number_held = self._watch.is_held(employee, LoginChannel.WHATSAPP, number, now)
        options = (
            ChannelOption(
                LoginChannel.EMAIL,
                mask_destination(MfaMethod.EMAIL, email),
                email is not None and not email_held,
                recently_changed=email_held,
            ),
            ChannelOption(
                LoginChannel.WHATSAPP,
                mask_destination(MfaMethod.WHATSAPP, number),
                self._whatsapp.configured and number is not None and quota.remaining > 0 and not number_held,
                quota.remaining,
                recently_changed=number_held,
                unavailable=not self._whatsapp.configured,
            ),
        )
        return Identified(self._sessions.open(SubjectType.EMPLOYEE_LOGIN, employee.id), options)


class SendLoginCode:
    def __init__(
        self,
        employees: EmployeeRepository,
        codes: LoginCodeRepository,
        sender: EmailSender,
        clock: Clock,
        key: str,
        *,
        show_code: bool,
        whatsapp: WhatsAppSender,
        quotas: WhatsAppQuotaRepository,
        watch: ContactWatch,
        messages: LoginMessages,
    ) -> None:
        self._watch = watch
        self._messages = messages
        self._employees = employees
        self._codes = codes
        self._sender = sender
        self._whatsapp = whatsapp
        self._quotas = quotas
        self._clock = clock
        self._key = key
        self._show_code = show_code

    def execute(self, employee_id: str, session_token: str, channel: LoginChannel) -> LoginCodeSent:
        employee = self._employees.get(employee_id)
        if employee is None:  # devenu inactif depuis l'identification
            raise NotAuthenticated()
        now = self._clock.now()
        if channel is LoginChannel.WHATSAPP:
            if not self._whatsapp.configured:
                raise WhatsAppUnavailable()
            destination = whatsapp_number(employee.telephone_number)
            if destination is None:
                raise ContactHr.no_whatsapp()
            quota = _quota(self._quotas, employee.id, now)
            quota.check()  # US-1004 : le 6e message du mois est refusé
        else:
            destination = _email_of(employee)
            if destination is None:
                raise ContactHr()
            quota = None
        if self._watch.is_held(employee, channel, destination, now):  # Vault a pu changer depuis l'identification
            raise ContactHr.recently_changed()

        login_code = self._codes.get(employee.id) or LoginCode(employee.id, channel)
        code = new_login_code()
        login_code.issue(hash_login_code(self._key, employee.id, channel, code), hash_token(session_token), now, channel)
        try:
            if quota is None:
                self._sender.send(destination, *self._messages.code_email(employee.first_name, code, now.year))
            else:
                self._whatsapp.send_code(destination, code)
        except MessageNotSent:  # rien n'est enregistré : ni l'attente, ni le renvoi
            raise (CodeEmailNotSent() if quota is None else LoginUnavailable()) from None
        if quota is not None:
            quota.consume()  # renvois compris
            self._quotas.save(quota)
        self._codes.save(login_code)
        method = MfaMethod.EMAIL if quota is None else MfaMethod.WHATSAPP
        return LoginCodeSent(
            channel=channel,
            destination=mask_destination(method, destination),
            expires_in=int(CODE_VALIDITY.total_seconds()),
            resend_in=int(RESEND_GAP.total_seconds()),
            local_code=code if self._show_code else None,
            remaining=None if quota is None else quota.remaining,
        )


class VerifyLoginCode:
    def __init__(
        self,
        employees: EmployeeRepository,
        codes: LoginCodeRepository,
        sessions: SessionService,
        clock: Clock,
        logins: LoginJournal,
        messages: LoginMessages,
        key: str,
    ) -> None:
        self._employees = employees
        self._codes = codes
        self._sessions = sessions
        self._clock = clock
        self._logins = logins
        self._messages = messages
        self._key = key

    def execute(self, employee_id: str, session_token: str, code: str) -> str:
        employee = self._employees.get(employee_id)
        if employee is None:
            raise NotAuthenticated()
        now = self._clock.now()

        login_code = self._codes.get(employee.id)
        if login_code is None:
            raise LoginCodeExpired()
        right = login_code.check(
            hash_login_code(self._key, employee.id, login_code.channel, code), hash_token(session_token), now
        )
        self._codes.save(login_code)
        if not right:  # US-1015 : un code faux ne verrouille pas ; 3 erreurs brûlent le code (modèle)
            raise InvalidLoginCode()

        self._sessions.close(session_token)
        token = self._sessions.open(SubjectType.EMPLOYEE, employee.id)
        self._logins.record(EmployeeLogin(employee.id, now))
        self._messages.login_succeeded(_email_of(employee), employee.first_name, now)
        return token
