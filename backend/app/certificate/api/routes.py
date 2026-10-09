"""US-301, US-303 : /api/me/certificates — formulaire, dépôt signé, enregistrement, liste."""

from datetime import datetime

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.certificate.application.use_cases import CertificateView
from app.certificate.domain.certificate import CertificateFields

router = APIRouter(prefix="/api/me/certificates", tags=["certificates"])


class ChoiceOut(BaseModel):
    value: str
    label: str


class LevelOut(ChoiceOut):
    examples: str
    needs_domain: bool
    on_scale: bool


class FormOut(BaseModel):
    types: list[ChoiceOut]
    levels: list[LevelOut]
    domains: list[ChoiceOut]
    max_mb: int
    limit: int


class UnlocksOut(BaseModel):
    level: str | None
    searchable: str


class CertificateOut(BaseModel):
    """Liste explicite : ni la clé de stockage, ni le nom du fichier stocké (CA-05)."""

    id: str
    certificate_type: str
    type_label: str
    level: str
    level_label: str
    title: str
    institution: str
    year: int
    country: str | None
    domain: str | None
    domain_label: str | None
    status: str
    status_label: str
    submitted_at: datetime
    unlocks: UnlocksOut

    @classmethod
    def of(cls, view: CertificateView) -> "CertificateOut":
        return cls(**(view.__dict__ | {"unlocks": UnlocksOut(**view.unlocks.__dict__)}))


class CertificatesOut(BaseModel):
    certificates: list[CertificateOut]
    limit: int
    validated_level: str | None


class UploadIn(BaseModel):
    content_type: str = ""
    size_bytes: int = 0


class UploadOut(BaseModel):
    upload_id: str
    method: str
    url: str
    headers: dict[str, str]


class DepositIn(BaseModel):
    certificate_type: str = ""
    level: str = ""
    title: str = ""
    institution: str = ""
    year: str = ""
    foreign: bool = False
    country: str = ""
    domain: str = ""
    domain_other: str = ""
    upload_id: str = ""
    original_name: str = ""


@router.get("/form")
def certificate_form(request: Request, employee_id: str = Depends(current_employee_id)) -> FormOut:
    form = container(request).get_certificate_form().execute()
    return FormOut(
        types=[ChoiceOut(value=c.code, label=c.label) for c in form.types],
        levels=[LevelOut(value=lv.code, label=lv.label, examples=lv.examples, needs_domain=lv.needs_domain, on_scale=lv.on_scale) for lv in form.levels],
        domains=[ChoiceOut(value=c.code, label=c.label) for c in form.domains],
        max_mb=form.max_mb,
        limit=form.limit,
    )


@router.get("")
def list_my_certificates(request: Request, employee_id: str = Depends(current_employee_id)) -> CertificatesOut:
    mine = container(request).list_my_certificates().execute(employee_id)
    return CertificatesOut(
        certificates=[CertificateOut.of(c) for c in mine.certificates], limit=mine.limit, validated_level=mine.validated_level
    )


@router.post("/uploads")
def request_upload(body: UploadIn, request: Request, employee_id: str = Depends(current_employee_id)) -> UploadOut:
    upload = container(request).request_upload().execute(employee_id, body.content_type, body.size_bytes)
    return UploadOut(upload_id=upload.upload_id, method=upload.ticket.method, url=upload.ticket.url, headers=upload.ticket.headers)


@router.put("/uploads/{upload_id}", status_code=204)
async def receive_local_upload(upload_id: str, request: Request, employee_id: str = Depends(current_employee_id)) -> Response:
    """Poste du développeur seulement (stockage local) : en ligne, cette adresse n'existe pas (404)."""
    limit = container(request).settings.max_upload_mb * 1024 * 1024
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > limit:
            break
    container(request).receive_local_upload().execute(employee_id, upload_id, bytes(content))
    return Response(status_code=204)


@router.post("", status_code=201)
def deposit_certificate(body: DepositIn, request: Request, employee_id: str = Depends(current_employee_id)) -> CertificateOut:
    fields = CertificateFields(
        body.certificate_type,
        body.level,
        body.title,
        body.institution,
        body.year,
        body.foreign,
        body.country,
        body.domain,
        body.domain_other,
    )
    view = container(request).deposit_certificate().execute(employee_id, fields, body.upload_id, body.original_name)
    return CertificateOut.of(view)


class FeedbackIn(BaseModel):
    rating: int = 0


@router.post("/{certificate_id}/feedback", status_code=204)
def give_feedback(
    certificate_id: str, body: FeedbackIn, request: Request, employee_id: str = Depends(current_employee_id)
) -> Response:
    container(request).give_feedback().execute(employee_id, certificate_id, body.rating)
    return Response(status_code=204)
