"""US-15, US-23 : connexion et gestion des comptes administrateurs enregistrés dans la base."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from app.auth.application.admin_mfa import CodeSent, MfaCodes, MfaStatus
from app.auth.application.sessions import SessionService
from app.auth.domain.admin import AdminAccount, AdminRole, RoleChange, ROLE_LABELS, validate_admin_password, validate_username
from app.auth.domain.errors import (
    AccountLocked,
    AdminAlreadyExists,
    AdminNotFound,
    CannotDeleteSelf,
    InsufficientRole,
    InvalidAdminCredentials,
    LastAdmin,
    LastAdminRole,
    NotAuthenticated,
    PasswordMismatch,
    PasswordUnchanged,
    UsernameTaken,
    WrongCurrentPassword,
)
from app.auth.domain.mfa import MfaMethod
from app.auth.domain.model import SubjectType
from app.auth.domain.ports import AdminAccountRepository, PasswordHasher
from app.shared.domain.clock import Clock

NewId = Callable[[], str]


def _new_id() -> str:
    return uuid.uuid4().hex


@dataclass(frozen=True)
class AdminView:
    id: str
    username: str
    created_at: datetime
    created_by: str | None
    """Identifiant (nom de connexion) de l'administrateur qui a créé le compte."""
    last_login_at: datetime | None
    must_change_password: bool
    role: AdminRole = AdminRole.ADMIN
    role_label: str = "Administrateur"
    mfa_method: MfaMethod | None = None
    """US-102 : méthode de double authentification enregistrée (None : à choisir à la prochaine connexion)."""


@dataclass(frozen=True)
class AdminLoginResult:
    token: str
    """Session « en attente du code » (US-102) : le second facteur ouvre la session RH."""
    mfa: MfaStatus
    code: CodeSent | None = None
    """Code envoyé dès la connexion quand la méthode enregistrée est WhatsApp ou email."""


class LoginAdmin:
    """US-15 : connexion d'un administrateur.

    Blocage **par compte** (5 échecs consécutifs → 15 minutes, conservé en base). Un identifiant
    inconnu reçoit le même message qu'un mauvais mot de passe et ne bloque aucun compte (US-23).

    US-102 : le bon mot de passe n'ouvre qu'une session en attente du code ; le compteur d'erreurs
    n'est remis à zéro qu'une fois le code vérifié.
    """

    def __init__(
        self,
        admins: AdminAccountRepository,
        hasher: PasswordHasher,
        sessions: SessionService,
        clock: Clock,
        mfa: MfaCodes,
    ) -> None:
        self._admins = admins
        self._hasher = hasher
        self._sessions = sessions
        self._clock = clock
        self._mfa = mfa

    def execute(self, username: str, password: str) -> AdminLoginResult:
        admin = self._admins.find_by_username(username) if username else None
        if admin is None:
            self._record("ADMIN_LOGIN_FAILED", None, username=username or "")
            raise InvalidAdminCredentials()
        now = self._clock.now()
        if admin.is_locked(now):
            self._record("ADMIN_LOGIN_FAILED", admin.id, reason="locked")
            raise AccountLocked(admin.seconds_until_unlock(now))
        if not self._hasher.verify(admin.password_hash, password):
            admin.register_failure(now)
            self._admins.save(admin)
            self._record("ADMIN_LOGIN_FAILED", admin.id, reason="password")
            if admin.is_locked(now):
                raise AccountLocked(admin.seconds_until_unlock(now))
            raise InvalidAdminCredentials()

        return self._second_factor(admin)

    def _second_factor(self, admin: AdminAccount) -> AdminLoginResult:
        code = None
        if admin.mfa_enrolled and admin.mfa_method.sends_code:
            code = self._mfa.issue(admin, admin.mfa_method, admin.mfa_destination)
            self._admins.save(admin)
        self._record("ADMIN_PASSWORD_OK", admin.id)
        token = self._sessions.open(SubjectType.ADMIN_MFA, admin.id)
        return AdminLoginResult(token, self._mfa.status(admin), code)

    def _record(self, event: str, admin_id: str | None, **details: str) -> None:
        self._mfa.log.record(event, admin_id, **details)


class GetCurrentAdmin:
    """Compte de la session admin ; un compte supprimé entre-temps ne donne plus accès."""

    def __init__(self, admins: AdminAccountRepository) -> None:
        self._admins = admins

    def execute(self, admin_id: str) -> AdminAccount:
        admin = self._admins.get(admin_id)
        if admin is None:
            raise NotAuthenticated()
        return admin


class ImportConfiguredAdmin:
    """US-23 CA-03 : migration du compte de la configuration (`ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`)
    si la base n'a encore aucun administrateur."""

    def __init__(
        self,
        admins: AdminAccountRepository,
        clock: Clock,
        username: str,
        password_hash: str,
        new_id: NewId = _new_id,
    ) -> None:
        self._admins = admins
        self._clock = clock
        self._username = username
        self._password_hash = password_hash
        self._new_id = new_id

    def execute(self) -> None:
        if not (self._username and self._password_hash) or self._admins.count() > 0:
            return
        self._admins.add(
            AdminAccount(
                id=self._new_id(),
                username=self._username.strip(),
                password_hash=self._password_hash,
                created_at=self._clock.now(),
            )
        )


class CreateFirstAdmin:
    """US-23 CA-01 : premier compte, créé sur l'ordinateur du portail (jamais par le web)."""

    def __init__(
        self, admins: AdminAccountRepository, hasher: PasswordHasher, clock: Clock, new_id: NewId = _new_id
    ) -> None:
        self._admins = admins
        self._hasher = hasher
        self._clock = clock
        self._new_id = new_id

    def execute(self, username: str, password: str, confirmation: str) -> AdminAccount:
        if self._admins.count() > 0:
            raise AdminAlreadyExists()
        username = validate_username(username)
        validate_admin_password(password, field="password")
        if password != confirmation:
            raise PasswordMismatch(field="password_confirmation")
        admin = AdminAccount(
            id=self._new_id(),
            username=username,
            password_hash=self._hasher.hash(password),
            created_at=self._clock.now(),
        )
        self._admins.add(admin)
        return admin


class ListAdmins:
    def __init__(self, admins: AdminAccountRepository) -> None:
        self._admins = admins

    def execute(self) -> list[AdminView]:
        accounts = self._admins.list_all()
        usernames = {account.id: account.username for account in accounts}
        return [
            AdminView(
                id=account.id,
                username=account.username,
                created_at=account.created_at,
                created_by=usernames.get(account.created_by) if account.created_by else None,
                last_login_at=account.last_login_at,
                must_change_password=account.must_change_password,
                role=account.role,
                role_label=ROLE_LABELS.get(account.role, account.role.value),
                mfa_method=account.mfa_method,
            )
            for account in accounts
        ]


class AddAdmin:
    """US-23 CA-05 : ajout d'un administrateur avec un mot de passe provisoire ;
    US-103 : rôle attribué à la création (Agent RH par défaut)."""

    def __init__(
        self, admins: AdminAccountRepository, hasher: PasswordHasher, clock: Clock, new_id: NewId = _new_id
    ) -> None:
        self._admins = admins
        self._hasher = hasher
        self._clock = clock
        self._new_id = new_id

    def execute(
        self, actor_id: str, username: str, password: str, role: AdminRole = AdminRole.AGENT_RH
    ) -> AdminAccount:
        actor = self._admins.get(actor_id)
        if actor is not None and actor.role != AdminRole.ADMIN:
            raise InsufficientRole("Seul un administrateur peut créer des comptes.")
        username = validate_username(username)
        validate_admin_password(password, field="password")
        if self._admins.username_taken(username):
            raise UsernameTaken(field="username")
        admin = AdminAccount(
            id=self._new_id(),
            username=username,
            password_hash=self._hasher.hash(password),
            created_at=self._clock.now(),
            role=role,
            created_by=actor_id,
            must_change_password=True,
        )
        self._admins.add(admin)
        return admin


class ChangeAdminRole:
    """US-103 : modification du rôle d'un compte RH par un Administrateur."""

    def __init__(self, admins: AdminAccountRepository, clock: Clock) -> None:
        self._admins = admins
        self._clock = clock

    def execute(self, actor_id: str, target_id: str, new_role: AdminRole) -> AdminAccount:
        actor = self._admins.get(actor_id)
        if actor is None or actor.role != AdminRole.ADMIN:
            raise InsufficientRole("Seul un administrateur peut modifier les rôles.")
        target = self._admins.get(target_id)
        if target is None:
            raise AdminNotFound()
        if target.role == new_role:
            return target
        if target.role == AdminRole.ADMIN and new_role != AdminRole.ADMIN:
            other_admins = sum(
                1 for a in self._admins.list_all() if a.role == AdminRole.ADMIN and a.id != target.id
            )
            if other_admins == 0:
                raise LastAdminRole("Le dernier administrateur ne peut pas changer de rôle.")
        old_role = target.role
        target.role = new_role
        self._admins.save(target)
        self._admins.record_role_change(
            RoleChange(
                id=None,
                admin_id=target.id,
                actor_id=actor.id,
                old_role=old_role,
                new_role=new_role,
                at=self._clock.now(),
            )
        )
        return target


class ListRoleChanges:
    """US-103 CA-03 : historique des modifications de rôle."""

    def __init__(self, admins: AdminAccountRepository) -> None:
        self._admins = admins

    def execute(self, admin_id: str | None = None) -> list[RoleChange]:
        return self._admins.list_role_changes(admin_id)


class DeleteAdmin:
    """US-23 CA-09, CA-10 : suppression d'un autre administrateur ; ses sessions sont fermées."""

    def __init__(self, admins: AdminAccountRepository, sessions: SessionService) -> None:
        self._admins = admins
        self._sessions = sessions

    def execute(self, actor_id: str, admin_id: str) -> None:
        if self._admins.get(admin_id) is None:
            raise AdminNotFound()
        if admin_id == actor_id:
            raise CannotDeleteSelf()
        if self._admins.count() <= 1:
            raise LastAdmin()
        self._admins.delete(admin_id)
        self._sessions.close_all_for(SubjectType.ADMIN, admin_id)


class ChangeAdminPassword:
    """US-23 CA-07, CA-08 : nouveau mot de passe ; renvoie le jeton d'une nouvelle session,
    toutes les autres sessions de ce compte étant fermées."""

    def __init__(self, admins: AdminAccountRepository, hasher: PasswordHasher, sessions: SessionService) -> None:
        self._admins = admins
        self._hasher = hasher
        self._sessions = sessions

    def execute(self, admin_id: str, current: str, new: str, confirmation: str) -> str:
        admin = self._admins.get(admin_id)
        if admin is None:
            raise NotAuthenticated()
        if not self._hasher.verify(admin.password_hash, current):
            raise WrongCurrentPassword(field="current_password")
        validate_admin_password(new, field="new_password")
        if new == current:
            raise PasswordUnchanged(field="new_password")
        if new != confirmation:
            raise PasswordMismatch(field="new_password_confirmation")
        admin.password_hash = self._hasher.hash(new)
        admin.must_change_password = False
        self._admins.save(admin)
        self._sessions.close_all_for(SubjectType.ADMIN, admin.id)
        return self._sessions.open(SubjectType.ADMIN, admin.id)
