import time
from typing import Literal

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.auth.api.dependencies import (
    SESSION_COOKIE,
    clear_session_cookie,
    container,
    current_admin_pending,
    current_employee_id,
    current_employee_login,
    set_session_cookie,
)
from app.auth.api.mfa_routes import CodeSentOut, LoginStepOut, MfaStatusOut
from app.auth.domain.login_code import LoginChannel

router = APIRouter(tags=["auth"])


class IdentifyIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    employee_code: str = Field(min_length=1, max_length=32)
    birth_date: str = Field(max_length=32)
    """US-1014 : huit chiffres JJMMAAAA, lus par le serveur."""
    captcha: str | None = Field(default=None, max_length=8)
    """US-1015 : réponse au calcul, demandé à partir de 3 échecs."""


class ChannelOut(BaseModel):
    channel: LoginChannel
    destination: str | None
    available: bool
    remaining: int | None = None
    recently_changed: bool = False
    unavailable: bool = False


class IdentifiedOut(BaseModel):
    channels: list[ChannelOut]


class SendCodeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")  # aucune autre adresse ne peut être donnée (doc PAM)

    channel: Literal["EMAIL", "WHATSAPP"]


class LoginCodeOut(BaseModel):
    channel: LoginChannel
    destination: str
    expires_in: int
    resend_in: int
    local_code: str | None = None
    remaining: int | None = None


class VerifyIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class AdminLoginIn(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=200)


# --- Employé ---------------------------------------------------------------


def client_ip(request: Request) -> str:
    """US-1015 : l'adresse vue par le serveur (sur AWS, celle de la passerelle), jamais un champ du formulaire."""
    return request.client.host if request.client else ""


@router.post("/api/auth/identify", response_model=IdentifiedOut)
def identify(payload: IdentifyIn, request: Request, response: Response) -> IdentifiedOut:
    """US-1003 : code employé et date de naissance. Réponse au bout du même délai minimal, réussie ou non."""
    started = time.monotonic()
    try:
        identified = container(request).identify_employee().execute(
            payload.employee_code, payload.birth_date, client_ip(request), payload.captcha
        )
    finally:
        remaining = container(request).settings.login_min_response_ms / 1000 - (time.monotonic() - started)
        if remaining > 0:
            time.sleep(remaining)
    set_session_cookie(request, response, identified.token, max_age=20 * 60)
    return IdentifiedOut(channels=[ChannelOut(**option.__dict__) for option in identified.channels])


@router.post("/api/auth/code", response_model=LoginCodeOut, response_model_exclude_none=True)
def send_code(
    payload: SendCodeIn, request: Request, employee_id: str = Depends(current_employee_login)
) -> LoginCodeOut:
    """US-1003 : envoie (ou renvoie) le code au courriel de Vault."""
    sent = container(request).send_login_code().execute(
        employee_id, request.cookies.get(SESSION_COOKIE), LoginChannel(payload.channel)
    )
    return LoginCodeOut(**sent.__dict__)


@router.post("/api/auth/verify", status_code=204)
def verify(
    payload: VerifyIn, request: Request, response: Response, employee_id: str = Depends(current_employee_login)
) -> None:
    """US-1003 : code juste, la session employé remplace la session d'identification."""
    token = container(request).verify_login_code().execute(
        employee_id, request.cookies.get(SESSION_COOKIE), payload.code
    )
    set_session_cookie(request, response, token, max_age=container(request).settings.employee_session_minutes * 60)


@router.post("/api/auth/keep-alive", status_code=204, dependencies=[Depends(current_employee_id)])
def keep_alive() -> None:
    """US-125 : l'écran signale une activité (clic, saisie, défilement) ; la session repart pour sa durée."""


@router.get("/api/auth/session-options")
def session_options(request: Request) -> dict[str, int]:
    """US-125 : durées d'inactivité après lesquelles l'écran ramène à la connexion."""
    settings = container(request).settings
    return {
        "employee_idle_minutes": settings.employee_idle_minutes,
        "admin_idle_minutes": settings.admin_session_minutes,
    }


@router.post("/api/auth/logout", status_code=204, dependencies=[Depends(current_employee_id)])
def logout(request: Request, response: Response) -> None:
    container(request).session_service().close(request.cookies.get(SESSION_COOKIE))
    clear_session_cookie(response)


# --- Administrateur ---------------------------------------------------------


@router.get("/api/auth/admin-options")
def admin_login_options(request: Request) -> dict[str, bool]:
    """US-112 : l'écran de connexion de gestion annonce, ou non, l'étape du code."""
    return {"mfa_required": container(request).settings.admin_mfa_required}


@router.post("/api/admin/auth/login", status_code=202, response_model=LoginStepOut)
def admin_login(payload: AdminLoginIn, request: Request) -> Response:
    """US-102 : mot de passe vérifié ; la session reste « en attente du code » jusqu'au second facteur.
    US-112 : double authentification coupée, la session complète s'ouvre (204)."""
    result = container(request).login_admin().execute(payload.username, payload.password)
    if result.mfa is None:
        opened = Response(status_code=204)
        set_session_cookie(request, opened, result.token)
        return opened
    step = LoginStepOut(mfa=MfaStatusOut.of(result.mfa), code=CodeSentOut.of(result.code))
    accepted = JSONResponse(step.model_dump(mode="json"), status_code=202)
    set_session_cookie(request, accepted, result.token)
    return accepted


@router.post("/api/admin/auth/keep-alive", status_code=204, dependencies=[Depends(current_admin_pending)])
def admin_keep_alive() -> None:
    """US-125 : activité dans l'espace de gestion (y compris pendant le changement d'un mot de passe provisoire)."""


@router.post("/api/admin/auth/logout", status_code=204, dependencies=[Depends(current_admin_pending)])
def admin_logout(request: Request, response: Response) -> None:
    container(request).session_service().close(request.cookies.get(SESSION_COOKIE))
    clear_session_cookie(response)
