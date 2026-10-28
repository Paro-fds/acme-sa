from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id

router = APIRouter(prefix="/api/me/per", tags=["per"])


class PerAccountOut(BaseModel):
    number: str
    opened_on: str
    amount: str
    interest: str


class PerSnapshotOut(BaseModel):
    period: str
    period_label: str
    updated_on: str
    amount: str
    interest: str
    accounts: list[PerAccountOut]


class PerOut(BaseModel):
    balance: PerSnapshotOut
    statement: list[PerSnapshotOut]


def _out(photo) -> PerSnapshotOut:
    return PerSnapshotOut(**{**photo.__dict__, "accounts": [PerAccountOut(**a.__dict__) for a in photo.accounts]})


@router.get("", response_model=PerOut)
def my_per(request: Request, employee_id: str = Depends(current_employee_id)) -> PerOut:
    """US-1012 : ma balance PER (la photo la plus récente) et le relevé de toutes les photos."""
    photos = container(request).get_my_per().execute(employee_id)
    return PerOut(balance=_out(photos[0]), statement=[_out(photo) for photo in photos])


class PayslipLineOut(BaseModel):
    label: str
    nature: str
    amount: str


class PayslipOut(BaseModel):
    period: str
    period_label: str
    paid_on: str
    earnings: str
    deductions: str
    net: str
    lines: list[PayslipLineOut]


@router.get("/payslips", response_model=list[PayslipOut])
def my_payslips(request: Request, employee_id: str = Depends(current_employee_id)) -> list[PayslipOut]:
    """US-1020 : mes bulletins de paie, du plus récent au plus ancien."""
    return [
        PayslipOut(**{**slip.__dict__, "lines": [PayslipLineOut(**line.__dict__) for line in slip.lines]})
        for slip in container(request).get_my_payslips().execute(employee_id)
    ]


@router.get("/payslips/{period}.pdf", response_class=Response)
def my_payslip_pdf(period: str, request: Request, employee_id: str = Depends(current_employee_id)) -> Response:
    """US-1021 : la fiche de paie du mois AAAA-MM en PDF (comme /api/fiche.pdf du module du directeur)."""
    content, filename = container(request).download_my_payslip().execute(employee_id, period)
    return Response(
        content, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
