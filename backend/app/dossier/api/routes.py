"""US-202, US-203 : /api/me/dossier — consentement, coordonnées, contact d'urgence, niveau d'études ;
confirmer ou signaler agence, poste, date d'embauche ; US-205 : confirmer ses informations chaque année."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict

from app.auth.api.dependencies import container, current_employee_id
from app.dossier.application.use_cases import ContactView, DossierView, EmailView, FieldView, FreshnessView

router = APIRouter(prefix="/api/me/dossier", tags=["dossier"])


class ConsentOut(BaseModel):
    information_notice_at: datetime | None
    whatsapp: bool | None


class FieldOut(BaseModel):
    value: str | None
    complete: bool
    confirmed_at: datetime | None
    read_only: bool = False

    @classmethod
    def of(cls, view: FieldView) -> "FieldOut":
        return cls(value=view.value, complete=view.complete, confirmed_at=view.confirmed_at, read_only=view.read_only)


class EmailOut(FieldOut):
    no_email: bool

    @classmethod
    def of(cls, view: EmailView) -> "EmailOut":
        return cls(
            value=view.value, complete=view.complete, confirmed_at=view.confirmed_at, read_only=view.read_only,
            no_email=view.no_email,
        )


class ContactOut(BaseModel):
    name: str | None
    relationship: str | None
    telephone: str | None
    complete: bool
    confirmed_at: datetime | None

    @classmethod
    def of(cls, view: ContactView) -> "ContactOut":
        return cls(**view.__dict__)


class ChoiceOut(BaseModel):
    value: str
    label: str


class LevelOut(ChoiceOut):
    examples: str


class CompletionOut(BaseModel):
    percent: int
    complete: int
    total: int


class HrItemOut(BaseModel):
    key: str
    label: str
    value: str
    status: str
    answered_at: datetime | None


class DossierOut(BaseModel):
    """Liste explicite des champs exposés : aucune colonne de l'export hors coordonnées (ENF-07)."""

    consent: ConsentOut
    telephone: FieldOut
    address: FieldOut
    email: EmailOut
    emergency_contact: ContactOut
    education_level: FieldOut
    completion: CompletionOut
    hr_information: list[HrItemOut]
    relationships: list[ChoiceOut]
    education_levels: list[LevelOut]

    @classmethod
    def of(cls, view: DossierView) -> "DossierOut":
        return cls(
            consent=ConsentOut(**view.consent.__dict__),
            telephone=FieldOut.of(view.telephone),
            address=FieldOut.of(view.address),
            email=EmailOut.of(view.email),
            emergency_contact=ContactOut.of(view.emergency_contact),
            education_level=FieldOut.of(view.education_level),
            completion=CompletionOut(
                percent=view.completion.percent, complete=view.completion.complete, total=view.completion.total
            ),
            hr_information=[HrItemOut(**item.__dict__) for item in view.hr_information],
            relationships=[ChoiceOut(value=c.code, label=c.label) for c in view.relationships],
            education_levels=[LevelOut(value=lv.code, label=lv.label, examples=lv.examples) for lv in view.education_levels],
        )


class ConsentIn(BaseModel):
    information_notice: bool = False
    whatsapp: bool = False


class CoordinatesIn(BaseModel):
    """US-1011 : seule l'adresse ; un téléphone ou un courriel envoyé est refusé (lecture seule)."""

    model_config = ConfigDict(extra="forbid")

    address: str = ""


class ContactAndEducationIn(BaseModel):
    contact_name: str = ""
    contact_relationship: str = ""
    contact_telephone: str = ""
    education_level: str = ""


def _dossier(request: Request, employee_id: str) -> DossierOut:
    return DossierOut.of(container(request).get_my_dossier().execute(employee_id))


@router.get("")
def get_my_dossier(request: Request, employee_id: str = Depends(current_employee_id)) -> DossierOut:
    return _dossier(request, employee_id)


@router.post("/consent")
def give_consent(body: ConsentIn, request: Request, employee_id: str = Depends(current_employee_id)) -> DossierOut:
    container(request).give_consent().execute(employee_id, body.information_notice, body.whatsapp)
    return _dossier(request, employee_id)


@router.put("/coordinates")
def save_coordinates(body: CoordinatesIn, request: Request, employee_id: str = Depends(current_employee_id)) -> DossierOut:
    container(request).save_coordinates().execute(employee_id, body.address)
    return _dossier(request, employee_id)


@router.put("/contact-and-education")
def save_contact_and_education(
    body: ContactAndEducationIn, request: Request, employee_id: str = Depends(current_employee_id)
) -> DossierOut:
    container(request).save_contact_and_education().execute(
        employee_id, body.contact_name, body.contact_relationship, body.contact_telephone, body.education_level
    )
    return _dossier(request, employee_id)


class ReportIn(BaseModel):
    correct_value: str = ""
    comment: str = ""


@router.post("/hr-information/{key}/confirm")
def confirm_hr_information(key: str, request: Request, employee_id: str = Depends(current_employee_id)) -> DossierOut:
    container(request).confirm_hr_information().execute(employee_id, key)
    return _dossier(request, employee_id)


@router.post("/hr-information/{key}/report")
def report_hr_error(
    key: str, body: ReportIn, request: Request, employee_id: str = Depends(current_employee_id)
) -> DossierOut:
    container(request).report_hr_error().execute(employee_id, key, body.correct_value, body.comment)
    return _dossier(request, employee_id)


class FreshnessItemOut(BaseModel):
    key: str
    label: str
    value: str
    confirmed_at: datetime
    expires_on: date
    reminder_on: date
    state: str


class FreshnessOut(BaseModel):
    items: list[FreshnessItemOut]
    stale_count: int

    @classmethod
    def of(cls, view: FreshnessView) -> "FreshnessOut":
        return cls(items=[FreshnessItemOut(**item.__dict__) for item in view.items], stale_count=view.stale_count)


@router.get("/freshness", response_model=FreshnessOut)
def get_freshness(request: Request, employee_id: str = Depends(current_employee_id)) -> FreshnessOut:
    """US-205 CA-01 : à jour, rappel dû (30 jours avant) ou périmée (12 mois sans confirmation)."""
    return FreshnessOut.of(container(request).get_freshness().execute(employee_id))


@router.post("/still-accurate", response_model=FreshnessOut)
def confirm_still_accurate(request: Request, employee_id: str = Depends(current_employee_id)) -> FreshnessOut:
    """US-205 CA-02 : « Ces informations sont-elles toujours exactes ? » Oui."""
    return FreshnessOut.of(container(request).confirm_still_accurate().execute(employee_id))
