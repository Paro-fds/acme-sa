"""US-23 : comptes administrateurs ; US-103 : gestion des rôles RH (Administrateur, Agent RH, Référentiel, Lecture seule)."""

from datetime import datetime

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from app.auth.api.dependencies import (
    container,
    current_admin,
    current_admin_pending,
    require_admin,
    set_session_cookie,
)
from app.admin.domain.audit import AuditAction, AuditEntry
from app.auth.application.admin_accounts import AdminView
from app.auth.domain.admin import AdminRole, RoleChange, ROLE_LABELS
from app.auth.domain.errors import InvalidRole

router = APIRouter(prefix="/api/admin", tags=["admin-accounts"])


class AdminMeOut(BaseModel):
    id: str
    username: str
    display_name: str
    """US-108 : nom affiché dans l'en-tête de l'espace RH (nom complet, sinon identifiant)."""
    role: str
    role_label: str
    must_change_password: bool
    mfa_required: bool = True
    """US-112 : faux quand la double authentification est coupée (menu et comptes sans rubrique du code)."""


class AdminOut(BaseModel):
    """Champs exposés explicitement : jamais le hash du mot de passe."""

    id: str
    username: str
    role: str
    role_label: str
    created_at: datetime
    created_by: str | None
    last_login_at: datetime | None
    must_change_password: bool
    mfa_method: str | None
    full_name: str | None = None
    email: str | None = None
    employee_id: str | None = None
    is_active: bool = True
    is_me: bool

    @classmethod
    def of(cls, view: AdminView, me: str) -> "AdminOut":
        return cls(**view.__dict__, is_me=view.id == me)


class RoleOptionOut(BaseModel):
    value: str
    label: str


class RoleChangeOut(BaseModel):
    id: int | None
    admin_id: str
    actor_id: str
    old_role: str
    old_role_label: str
    new_role: str
    new_role_label: str
    at: datetime

    @classmethod
    def of(cls, change: RoleChange) -> "RoleChangeOut":
        return cls(
            id=change.id,
            admin_id=change.admin_id,
            actor_id=change.actor_id,
            old_role=change.old_role.value if isinstance(change.old_role, AdminRole) else str(change.old_role),
            old_role_label=ROLE_LABELS.get(change.old_role, str(change.old_role)),
            new_role=change.new_role.value if isinstance(change.new_role, AdminRole) else str(change.new_role),
            new_role_label=ROLE_LABELS.get(change.new_role, str(change.new_role)),
            at=change.at,
        )


class AddAdminIn(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)
    role: str = Field(default="AGENT_RH", max_length=50)
    full_name: str | None = Field(default=None, max_length=150)
    email: str | None = Field(default=None, max_length=150)
    employee_id: str | None = Field(default=None, max_length=50)


class SetAdminStatusIn(BaseModel):
    is_active: bool


class ChangeRoleIn(BaseModel):
    role: str = Field(max_length=50)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(max_length=200)
    new_password_confirmation: str = Field(max_length=200)


def _parse_role(value: str) -> AdminRole:
    try:
        return AdminRole(value.strip().upper())
    except ValueError:
        raise InvalidRole()


@router.get("/me", response_model=AdminMeOut)
def me(request: Request, admin_id: str = Depends(current_admin_pending)) -> AdminMeOut:
    admin = container(request).get_current_admin().execute(admin_id)
    return AdminMeOut(
        id=admin.id,
        username=admin.username,
        display_name=admin.full_name or admin.username,
        role=admin.role.value,
        role_label=ROLE_LABELS.get(admin.role, admin.role.value),
        must_change_password=admin.must_change_password,
        mfa_required=container(request).settings.admin_mfa_required,
    )


@router.post("/me/password", status_code=204)
def change_my_password(
    payload: ChangePasswordIn, request: Request, response: Response, admin_id: str = Depends(current_admin_pending)
) -> None:
    token = container(request).change_admin_password().execute(
        admin_id, payload.current_password, payload.new_password, payload.new_password_confirmation
    )
    set_session_cookie(request, response, token)


@router.get("/roles", response_model=list[RoleOptionOut])
def list_roles(admin_id: str = Depends(require_admin)) -> list[RoleOptionOut]:
    """US-103 : rôles disponibles pour les comptes RH."""
    return [RoleOptionOut(value=role.value, label=label) for role, label in ROLE_LABELS.items()]


@router.get("/admins", response_model=list[AdminOut])
def list_admins(request: Request, admin_id: str = Depends(require_admin)) -> list[AdminOut]:
    return [AdminOut.of(view, admin_id) for view in container(request).list_admins().execute()]


@router.post("/admins", status_code=201, response_model=AdminOut)
def add_admin(payload: AddAdminIn, request: Request, admin_id: str = Depends(require_admin)) -> AdminOut:
    role = _parse_role(payload.role)
    created = container(request).add_admin().execute(
        actor_id=admin_id,
        username=payload.username,
        password=payload.password,
        role=role,
        full_name=payload.full_name,
        email=payload.email,
        employee_id=payload.employee_id,
    )
    container(request).audit_logs.add(
        AuditEntry(
            id=None,
            at=container(request).clock.now(),
            actor_id=admin_id,
            actor_name=admin_id,
            action=AuditAction.ACCOUNT_MANAGEMENT.value,
            target_id=created.username,
            target_name=created.full_name or created.username,
            details=f"Création du compte ({ROLE_LABELS.get(created.role, created.role)})",
        )
    )
    view = next(view for view in container(request).list_admins().execute() if view.id == created.id)
    return AdminOut.of(view, admin_id)


@router.put("/admins/{target_id}/role", response_model=AdminOut)
def change_role(
    target_id: str, payload: ChangeRoleIn, request: Request, admin_id: str = Depends(require_admin)
) -> AdminOut:
    """US-103 : changer le rôle d'un compte RH (réservé à l'Administrateur)."""
    new_role = _parse_role(payload.role)
    container(request).change_admin_role().execute(admin_id, target_id, new_role)
    view = next(view for view in container(request).list_admins().execute() if view.id == target_id)
    return AdminOut.of(view, admin_id)


@router.put("/admins/{target_id}/status", response_model=AdminOut)
def set_admin_status(
    target_id: str, payload: SetAdminStatusIn, request: Request, admin_id: str = Depends(require_admin)
) -> AdminOut:
    """US-104 CA-02, CA-03 : désactiver ou activer un compte RH."""
    updated = container(request).set_admin_status().execute(admin_id, target_id, payload.is_active)
    action_detail = "Compte réactivé" if payload.is_active else "Compte désactivé"
    container(request).audit_logs.add(
        AuditEntry(
            id=None,
            at=container(request).clock.now(),
            actor_id=admin_id,
            actor_name=admin_id,
            action=AuditAction.ACCOUNT_MANAGEMENT.value,
            target_id=updated.username,
            target_name=updated.full_name or updated.username,
            details=action_detail,
        )
    )
    view = next(view for view in container(request).list_admins().execute() if view.id == target_id)
    return AdminOut.of(view, admin_id)


@router.get("/admins/{target_id}/role-history", response_model=list[RoleChangeOut])
def role_history(
    target_id: str, request: Request, admin_id: str = Depends(require_admin)
) -> list[RoleChangeOut]:
    """US-103 CA-03 : historique tracé des rôles pour un compte."""
    changes = container(request).list_role_changes().execute(target_id)
    return [RoleChangeOut.of(change) for change in changes]


@router.delete("/admins/{target_id}", status_code=204)
def delete_admin(target_id: str, request: Request, admin_id: str = Depends(require_admin)) -> None:
    container(request).delete_admin().execute(admin_id, target_id)
