from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse
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
    reported_on: str
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


# Comme `_html` du directeur : la fiche n'est affichable que dans un cadre de PAM, sans script ni ressource externe.
PAYSLIP_HEADERS = {
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; "
    "frame-ancestors 'self'",
    "X-Frame-Options": "SAMEORIGIN",
}


@router.get("/payslips/{period}.html", response_class=HTMLResponse)
def my_payslip_sheet(period: str, request: Request, employee_id: str = Depends(current_employee_id)) -> HTMLResponse:
    """US-1022 : la fiche de paie du mois AAAA-MM, au format du directeur (comme /api/fiche de son module)."""
    return HTMLResponse(container(request).show_my_payslip().execute(employee_id, period), headers=PAYSLIP_HEADERS)


@router.get("/statement.pdf", response_class=Response)
def my_statement_pdf(
    request: Request, start: str = "", end: str = "", employee_id: str = Depends(current_employee_id)
) -> Response:
    """US-1024 : le relevé PER du jour `start` au jour `end` (AAAA-MM-JJ), en PDF (/api/releve-pdf du directeur)."""
    content, filename = container(request).get_my_statement_pdf().execute(employee_id, start, end)
    return Response(content, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
