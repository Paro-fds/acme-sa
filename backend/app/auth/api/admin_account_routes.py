"""US-23 : comptes administrateurs (liste, ajout, suppression, changement de son mot de passe)."""

from datetime import datetime

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from app.auth.api.dependencies import container, current_admin, current_admin_pending, set_session_cookie
from app.auth.application.admin_accounts import AdminView

router = APIRouter(prefix="/api/admin", tags=["admin-accounts"])


class AdminMeOut(BaseModel):
    id: str
    username: str
    must_change_password: bool


class AdminOut(BaseModel):
    """Champs exposés explicitement : jamais le hash du mot de passe."""

    id: str
    username: str
    created_at: datetime
    created_by: str | None
    last_login_at: datetime | None
    must_change_password: bool
    mfa_method: str | None
    is_me: bool

    @classmethod
    def of(cls, view: AdminView, me: str) -> "AdminOut":
        return cls(**view.__dict__, is_me=view.id == me)


class AddAdminIn(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(max_length=200)
    new_password_confirmation: str = Field(max_length=200)


@router.get("/me", response_model=AdminMeOut)
def me(request: Request, admin_id: str = Depends(current_admin_pending)) -> AdminMeOut:
    admin = container(request).get_current_admin().execute(admin_id)
    return AdminMeOut(id=admin.id, username=admin.username, must_change_password=admin.must_change_password)


@router.post("/me/password", status_code=204)
def change_my_password(
    payload: ChangePasswordIn, request: Request, response: Response, admin_id: str = Depends(current_admin_pending)
) -> None:
    token = container(request).change_admin_password().execute(
        admin_id, payload.current_password, payload.new_password, payload.new_password_confirmation
    )
    set_session_cookie(request, response, token)


@router.get("/admins", response_model=list[AdminOut])
def list_admins(request: Request, admin_id: str = Depends(current_admin)) -> list[AdminOut]:
    return [AdminOut.of(view, admin_id) for view in container(request).list_admins().execute()]


@router.post("/admins", status_code=201, response_model=AdminOut)
def add_admin(payload: AddAdminIn, request: Request, admin_id: str = Depends(current_admin)) -> AdminOut:
    created = container(request).add_admin().execute(admin_id, payload.username, payload.password)
    view = next(view for view in container(request).list_admins().execute() if view.id == created.id)
    return AdminOut.of(view, admin_id)


@router.delete("/admins/{target_id}", status_code=204)
def delete_admin(target_id: str, request: Request, admin_id: str = Depends(current_admin)) -> None:
    container(request).delete_admin().execute(admin_id, target_id)
