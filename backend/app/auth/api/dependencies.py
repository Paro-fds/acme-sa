"""Dépendances FastAPI d'authentification, partagées par toutes les routes protégées.

Les cas d'utilisation sont obtenus auprès du composition root via `request.app.state.container`
(la couche api n'importe jamais l'infrastructure).
"""

from fastapi import Request, Response

from app.auth.domain.errors import PasswordChangeRequired
from app.auth.domain.model import SubjectType

SESSION_COOKIE = "acme_session"


def container(request: Request):
    return request.app.state.container


def current_employee_id(request: Request) -> str:
    """Identifiant de l'employé connecté ; 401 sinon. Toutes les routes /api/me/* en dépendent."""
    return container(request).session_service().authenticate(
        request.cookies.get(SESSION_COOKIE), SubjectType.EMPLOYEE
    )


def current_admin_pending(request: Request) -> str:
    """Administrateur connecté, même s'il doit encore changer son mot de passe provisoire (US-23).

    401 sans session ou si le compte a été supprimé, 403 avec une session employé.
    Réservé à « qui suis-je », au changement de mot de passe et à la déconnexion.
    """
    admin_id = container(request).session_service().authenticate(
        request.cookies.get(SESSION_COOKIE), SubjectType.ADMIN
    )
    return container(request).get_current_admin().execute(admin_id).id


def current_admin(request: Request) -> str:
    """Administrateur connecté ; 403 `PASSWORD_CHANGE_REQUIRED` tant que son mot de passe est provisoire."""
    admin_id = current_admin_pending(request)
    if container(request).get_current_admin().execute(admin_id).must_change_password:
        raise PasswordChangeRequired()
    return admin_id


def set_session_cookie(request: Request, response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="strict",
        secure=request.url.scheme == "https",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")
