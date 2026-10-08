from datetime import date

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.auth.api.dependencies import (
    SESSION_COOKIE,
    clear_session_cookie,
    container,
    current_admin_pending,
    current_employee_id,
    set_session_cookie,
)
from app.auth.api.mfa_routes import CodeSentOut, LoginStepOut, MfaStatusOut
from app.auth.application.identity import Identity

router = APIRouter(tags=["auth"])


class IdentityIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    last_name: str = Field(min_length=1, max_length=100)
    first_name: str = Field(min_length=1, max_length=100)
    birth_date: date

    def to_identity(self) -> Identity:
        return Identity(self.last_name, self.first_name, self.birth_date)


class RegisterIn(IdentityIn):
    password: str = Field(max_length=200)
    password_confirmation: str = Field(max_length=200)


class LoginIn(IdentityIn):
    password: str = Field(max_length=200)


class AdminLoginIn(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)


# --- Employé ---------------------------------------------------------------


@router.post("/api/auth/register", status_code=204)
def register(payload: RegisterIn, request: Request, response: Response) -> None:
    token = container(request).register_password().execute(
        payload.to_identity(), payload.password, payload.password_confirmation
    )
    set_session_cookie(request, response, token)


@router.post("/api/auth/login", status_code=204)
def login(payload: LoginIn, request: Request, response: Response) -> None:
    token = container(request).login_employee().execute(payload.to_identity(), payload.password)
    set_session_cookie(request, response, token)


@router.post("/api/auth/logout", status_code=204, dependencies=[Depends(current_employee_id)])
def logout(request: Request, response: Response) -> None:
    container(request).session_service().close(request.cookies.get(SESSION_COOKIE))
    clear_session_cookie(response)


# --- Administrateur ---------------------------------------------------------


@router.post(
    "/api/admin/auth/login",
    status_code=204,
    responses={202: {"model": LoginStepOut, "description": "Mot de passe vérifié, second facteur attendu (US-102)"}},
)
def admin_login(payload: AdminLoginIn, request: Request, response: Response) -> Response:
    result = container(request).login_admin().execute(payload.username, payload.password)
    if result.mfa is None:
        set_session_cookie(request, response, result.token)
        response.status_code = 204
        return response
    step = LoginStepOut(mfa=MfaStatusOut.of(result.mfa), code=CodeSentOut.of(result.code))
    accepted = JSONResponse(step.model_dump(mode="json"), status_code=202)
    set_session_cookie(request, accepted, result.token)
    return accepted


@router.post("/api/admin/auth/logout", status_code=204, dependencies=[Depends(current_admin_pending)])
def admin_logout(request: Request, response: Response) -> None:
    container(request).session_service().close(request.cookies.get(SESSION_COOKIE))
    clear_session_cookie(response)
