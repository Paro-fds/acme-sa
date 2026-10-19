"""US-116 : notifications de l'espace de gestion, pour l'Agent RH et l'Administrateur seulement."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_admin_account
from app.auth.domain.admin import AdminAccount, AdminRole
from app.auth.domain.errors import InsufficientRole

router = APIRouter(prefix="/api/admin/notifications", tags=["notifications"])


def notified(request: Request) -> AdminAccount:
    """CA-03 : ceux qui traitent les certificats, signalements et candidatures."""
    account = current_admin_account(request)
    if account.role not in (AdminRole.ADMIN, AdminRole.AGENT_RH):
        raise InsufficientRole("Les notifications sont réservées à l'Agent RH et à l'Administrateur.")
    return account


class NotificationOut(BaseModel):
    key: str
    kind: str
    kind_label: str
    title: str
    detail: str
    at: datetime
    link: str
    unread: bool


class NotificationsOut(BaseModel):
    items: list[NotificationOut]
    unread_count: int
    has_more: bool


@router.get("", response_model=NotificationsOut)
def list_notifications(
    request: Request,
    kind: str | None = Query(None, max_length=40),
    limit: int = Query(50, ge=1, le=200),
    account: AdminAccount = Depends(notified),
) -> NotificationsOut:
    view = container(request).get_notifications().execute(account.id, account.employee_id, kind, limit)
    return NotificationsOut(
        items=[NotificationOut(**item.__dict__) for item in view.items],
        unread_count=view.unread_count,
        has_more=view.has_more,
    )


@router.post("/read-all", status_code=204)
def mark_all_read(request: Request, account: AdminAccount = Depends(notified)) -> Response:
    container(request).mark_all_notifications_read().execute(account.id)
    return Response(status_code=204)


@router.post("/{key}/read", status_code=204)
def mark_read(key: str, request: Request, account: AdminAccount = Depends(notified)) -> Response:
    container(request).mark_notification_read().execute(account.id, key[:100])
    return Response(status_code=204)
