"""US-102 : double authentification des comptes RH.

- `/api/admin/auth/mfa/*` : après le mot de passe, avec la session « en attente du code ».
- `/api/admin/me/mfa/*` : changement de méthode depuis son compte (CA-04).
- `/api/admin/admins/{id}/reset-mfa` : réinitialisation par un autre compte RH (CA-05).
"""

from fastapi import APIRouter, Depends, FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.auth.api.dependencies import SESSION_COOKIE, container, current_admin, set_session_cookie
from app.auth.application.admin_mfa import CodeSent, MfaStatus, SetupStarted
from app.auth.domain.errors import OfficeNetworkOnly
from app.auth.domain.mfa import MfaMethod
from app.auth.domain.model import SubjectType
from app.auth.domain.network import is_allowed
from app.shared.api.errors import error_body

router = APIRouter(prefix="/api/admin", tags=["admin-mfa"])


def current_admin_awaiting_code(request: Request) -> str:
    """Compte RH dont le mot de passe vient d'être vérifié ; 401 sans cette session, 403 avec une session employé."""
    return container(request).session_service().authenticate(
        request.cookies.get(SESSION_COOKIE), SubjectType.ADMIN_MFA
    )


class MfaStatusOut(BaseModel):
    enrolled: bool
    method: MfaMethod | None
    destination: str | None

    @classmethod
    def of(cls, status: MfaStatus) -> "MfaStatusOut":
        return cls(enrolled=status.enrolled, method=status.method, destination=status.destination)


class CodeSentOut(BaseModel):
    method: MfaMethod
    destination: str
    demo_code: str | None
    """Hors production : le code, affiché dans la « boîte de démonstration »."""

    @classmethod
    def of(cls, sent: CodeSent | None) -> "CodeSentOut | None":
        return cls(method=sent.method, destination=sent.destination, demo_code=sent.demo_code) if sent else None


class TotpOut(BaseModel):
    secret: str
    uri: str
    qr_code: str


class SetupOut(BaseModel):
    method: MfaMethod
    code: CodeSentOut | None
    totp: TotpOut | None

    @classmethod
    def of(cls, started: SetupStarted) -> "SetupOut":
        totp = started.totp
        return cls(
            method=started.method,
            code=CodeSentOut.of(started.code),
            totp=TotpOut(secret=totp.secret, uri=totp.uri, qr_code=totp.qr_code) if totp else None,
        )


class LoginStepOut(BaseModel):
    """Réponse 202 de la connexion RH : le second facteur est attendu."""

    mfa: MfaStatusOut
    code: CodeSentOut | None


class SetupIn(BaseModel):
    method: MfaMethod
    destination: str | None = Field(default=None, max_length=200)


class CodeIn(BaseModel):
    code: str = Field(max_length=10)


# --- Connexion : deuxième étape -----------------------------------------------------------


@router.get("/auth/mfa", response_model=MfaStatusOut)
def login_mfa_status(request: Request, admin_id: str = Depends(current_admin_awaiting_code)) -> MfaStatusOut:
    return MfaStatusOut.of(container(request).get_mfa_status().execute(admin_id))


@router.post("/auth/mfa/setup", response_model=SetupOut)
def login_mfa_setup(
    payload: SetupIn, request: Request, admin_id: str = Depends(current_admin_awaiting_code)
) -> SetupOut:
    return SetupOut.of(container(request).start_mfa_setup().execute(admin_id, payload.method, payload.destination))


@router.post("/auth/mfa/setup/confirm", status_code=204)
def login_mfa_setup_confirm(
    payload: CodeIn, request: Request, response: Response, admin_id: str = Depends(current_admin_awaiting_code)
) -> None:
    token = container(request).confirm_mfa_setup().execute(admin_id, payload.code, open_session=True)
    set_session_cookie(request, response, token)


@router.post("/auth/mfa/code", response_model=CodeSentOut)
def login_mfa_resend(request: Request, admin_id: str = Depends(current_admin_awaiting_code)) -> CodeSentOut:
    return CodeSentOut.of(container(request).send_mfa_code().execute(admin_id))


@router.post("/auth/mfa/verify", status_code=204)
def login_mfa_verify(
    payload: CodeIn, request: Request, response: Response, admin_id: str = Depends(current_admin_awaiting_code)
) -> None:
    token = container(request).verify_mfa().execute(admin_id, payload.code)
    set_session_cookie(request, response, token)


# --- CA-04 : changer de méthode depuis son compte ------------------------------------------


@router.get("/me/mfa", response_model=MfaStatusOut)
def my_mfa(request: Request, admin_id: str = Depends(current_admin)) -> MfaStatusOut:
    return MfaStatusOut.of(container(request).get_mfa_status().execute(admin_id))


@router.post("/me/mfa/code", response_model=CodeSentOut)
def my_mfa_code(request: Request, admin_id: str = Depends(current_admin)) -> CodeSentOut:
    return CodeSentOut.of(container(request).send_mfa_code().execute(admin_id))


@router.post("/me/mfa/confirm", status_code=204)
def my_mfa_confirm(payload: CodeIn, request: Request, admin_id: str = Depends(current_admin)) -> None:
    container(request).confirm_mfa_change().execute(admin_id, payload.code)


@router.post("/me/mfa/setup", response_model=SetupOut)
def my_mfa_setup(payload: SetupIn, request: Request, admin_id: str = Depends(current_admin)) -> SetupOut:
    return SetupOut.of(container(request).start_mfa_setup().execute(admin_id, payload.method, payload.destination))


@router.post("/me/mfa/setup/confirm", status_code=204)
def my_mfa_setup_confirm(payload: CodeIn, request: Request, admin_id: str = Depends(current_admin)) -> None:
    container(request).confirm_mfa_setup().execute(admin_id, payload.code, open_session=False)


# --- CA-05 : téléphone perdu ---------------------------------------------------------------


@router.post("/admins/{target_id}/reset-mfa", status_code=204)
def reset_mfa(target_id: str, request: Request, admin_id: str = Depends(current_admin)) -> None:
    container(request).reset_admin_mfa().execute(admin_id, target_id)


# --- CA-06 : réseau des bureaux --------------------------------------------------------------


def restrict_rh_space_to_office_network(app: FastAPI) -> None:
    """Toute route `/api/admin/*`, connexion comprise, refuse une adresse hors des réseaux configurés.

    Sur AWS, la même liste est appliquée en amont par le pare-feu (WAF) ; ici, c'est la défense de l'application.
    """

    @app.middleware("http")
    async def office_network_only(request: Request, call_next):
        if request.url.path.startswith("/api/admin"):
            networks = request.app.state.container.rh_networks
            address = request.client.host if request.client else None
            if not is_allowed(address, networks):
                error = OfficeNetworkOnly()
                return JSONResponse(error_body(error.code, error.message), status_code=403)
        return await call_next(request)
