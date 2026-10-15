"""US-802 : postes ouverts, côté espace RH. Tout compte RH consulte ; l'Agent RH et l'Administrateur saisissent ;
seul l'Administrateur publie, clôture et marque un poste pourvu."""

from datetime import date, datetime

from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, Field

from app.auth.api.dependencies import container, current_admin_account, current_employee_id
from app.auth.domain.admin import AdminAccount, AdminRole
from app.auth.domain.errors import InsufficientRole
from app.job.application.catalogue import JobProfileView
from app.job.application.use_cases import ApplicationView, MyOpeningView, OpeningView
from app.job.domain.notifications import reader_id
from app.job.domain.opening import Actor, Criteria, OpeningFields

router = APIRouter(prefix="/api/admin/openings", tags=["openings"])


def _actor(account: AdminAccount) -> Actor:
    return Actor(account.id, account.full_name or account.username)


def reader(request: Request) -> Actor:
    """Consultation : Administrateur, Agent RH, Lecture seule (US-108 : pas le Responsable du référentiel)."""
    account = current_admin_account(request)
    if account.role not in (AdminRole.ADMIN, AdminRole.AGENT_RH, AdminRole.READONLY):
        raise InsufficientRole("Action non autorisée pour votre rôle.")
    return _actor(account)


def editor(request: Request) -> Actor:
    """Saisie et modification : Agent RH ou Administrateur."""
    account = current_admin_account(request)
    if account.role not in (AdminRole.ADMIN, AdminRole.AGENT_RH):
        raise InsufficientRole("Seuls un Agent RH ou un Administrateur saisissent un poste.")
    return _actor(account)


def administrator(request: Request) -> Actor:
    """Publication, clôture, poste pourvu : Administrateur seul."""
    account = current_admin_account(request)
    if account.role != AdminRole.ADMIN:
        raise InsufficientRole("Seul un Administrateur change le statut d'un poste.")
    return _actor(account)


class CriteriaIn(BaseModel):
    """US-115 : plusieurs domaines et plusieurs unités."""

    min_level: str | None = Field(None, max_length=40)
    domains: list[str] = Field(default_factory=list, max_length=20)
    min_years_in_institution: int | None = None
    min_years_in_position: int | None = None
    min_grade: str | None = Field(None, max_length=10)
    unit_codes: list[str] = Field(default_factory=list, max_length=200)

    def to_criteria(self) -> Criteria:
        data = self.model_dump()
        return Criteria(**data | {"domains": tuple(self.domains), "unit_codes": tuple(self.unit_codes)})


class OpeningIn(BaseModel):
    code: str = Field("", max_length=40)
    title: str = Field("", max_length=400)
    # US-117 : texte libre tant que le référentiel n'est pas importé (120 caractères, contrôlés par le domaine).
    unit_code: str = Field("", max_length=200)
    target_grade: str = Field("", max_length=10)
    mission: str = Field("", max_length=4000)
    opens_on: date | None = None
    closes_on: date | None = None
    criteria: CriteriaIn = CriteriaIn()
    profile_code: str | None = Field(None, max_length=120)
    """US-119 : fiche du catalogue dont le poste est issu."""

    def to_fields(self) -> OpeningFields:
        return OpeningFields(
            code=self.code,
            title=self.title,
            unit_code=self.unit_code,
            target_grade=self.target_grade,
            mission=self.mission,
            opens_on=self.opens_on,
            closes_on=self.closes_on,
            criteria=self.criteria.to_criteria(),
            profile_code=self.profile_code,
        )


class OptionOut(BaseModel):
    code: str
    label: str


class UnitOptionOut(OptionOut):
    type_label: str


class OpeningFormOut(BaseModel):
    units: list[UnitOptionOut]
    levels: list[OptionOut]
    domains: list[OptionOut]


class CriteriaOut(BaseModel):
    min_level: str | None
    domains: list[str]
    min_years_in_institution: int | None
    min_years_in_position: int | None
    min_grade: str | None
    unit_codes: list[str]


class AudienceStepOut(BaseModel):
    excluded: int
    reason: str


class AudienceOut(BaseModel):
    """US-115 CA-04 : `base` employés dans les unités choisies, ce que chaque critère écarte, `visible` restants."""

    base: int
    base_label: str
    steps: list[AudienceStepOut]
    visible: int


class StepOut(BaseModel):
    status: str
    status_label: str
    at: datetime
    actor_name: str


class CriteriaChangeOut(BaseModel):
    at: datetime
    actor_name: str
    before: list[str]
    after: list[str]


class OpeningOut(BaseModel):
    id: int
    code: str
    title: str
    unit_code: str
    unit_label: str
    target_grade: str
    mission: str
    opens_on: date
    closes_on: date
    criteria: CriteriaOut
    criteria_lines: list[str]
    status: str
    status_label: str
    history: list[StepOut]
    criteria_changes: list[CriteriaChangeOut]
    profile_code: str | None
    profile_title: str | None


class OpeningListOut(BaseModel):
    items: list[OpeningOut]


def _out(view: OpeningView) -> OpeningOut:
    data = dict(view.__dict__)
    data["criteria"] = CriteriaOut(**view.criteria.__dict__)
    data["history"] = [StepOut(**step.__dict__) for step in view.history]
    data["criteria_changes"] = [CriteriaChangeOut(**change.__dict__) for change in view.criteria_changes]
    return OpeningOut(**data)


@router.get("/form", response_model=OpeningFormOut)
def opening_form(request: Request, _: Actor = Depends(reader)) -> OpeningFormOut:
    form = container(request).get_opening_form().execute()
    return OpeningFormOut(
        units=[UnitOptionOut(**unit.__dict__) for unit in form.units],
        levels=[OptionOut(**level.__dict__) for level in form.levels],
        domains=[OptionOut(**domain.__dict__) for domain in form.domains],
    )


@router.post("/audience", response_model=AudienceOut)
def preview_audience(body: CriteriaIn, request: Request, _: Actor = Depends(editor)) -> AudienceOut:
    """US-115 : combien d'employés verront le poste, recalculé pendant la saisie des critères."""
    result = container(request).preview_audience().execute(body.to_criteria())
    return AudienceOut(
        base=result.base,
        base_label=result.base_label,
        steps=[AudienceStepOut(excluded=step.excluded, reason=step.reason) for step in result.steps],
        visible=result.visible,
    )


@router.get("", response_model=OpeningListOut)
def list_openings(request: Request, _: Actor = Depends(reader)) -> OpeningListOut:
    return OpeningListOut(items=[_out(view) for view in container(request).list_openings().execute()])


@router.post("", response_model=OpeningOut, status_code=201)
def create_opening(body: OpeningIn, request: Request, actor: Actor = Depends(editor)) -> OpeningOut:
    return _out(container(request).create_opening().execute(body.to_fields(), actor))


@router.get("/{opening_id}", response_model=OpeningOut)
def get_opening(opening_id: int, request: Request, _: Actor = Depends(reader)) -> OpeningOut:
    return _out(container(request).get_opening().execute(opening_id))


@router.put("/{opening_id}", response_model=OpeningOut)
def update_opening(opening_id: int, body: OpeningIn, request: Request, actor: Actor = Depends(editor)) -> OpeningOut:
    return _out(container(request).update_opening().execute(opening_id, body.to_fields(), actor))


def _change_status(action: str):
    def route(opening_id: int, request: Request, actor: Actor = Depends(administrator)) -> OpeningOut:
        return _out(container(request).change_opening_status().execute(opening_id, action, actor))

    return route


for _action in ("publish", "close", "fill"):
    router.add_api_route(
        f"/{{opening_id}}/{_action}", _change_status(_action), methods=["POST"], response_model=OpeningOut,
        name=f"{_action}_opening",
    )


# --- US-119 : catalogue des postes ACME ---------------------------------------------------

catalogue_router = APIRouter(prefix="/api/admin/job-profiles", tags=["openings"])


class SectionOut(BaseModel):
    title: str
    lines: list[str]


def _sections(sections) -> list[SectionOut]:
    return [SectionOut(title=section.title, lines=list(section.lines)) for section in sections]


class JobProfileSummaryOut(BaseModel):
    code: str
    position_code: str
    title: str
    department: str | None
    service: str | None
    level_text: str | None


class JobProfileListOut(BaseModel):
    items: list[JobProfileSummaryOut]


class JobProfileOut(JobProfileSummaryOut):
    competences: list[str]
    description: str
    sections: list[SectionOut]
    suggested_domains: list[str]
    suggested_level: str | None

    @classmethod
    def of(cls, view: JobProfileView) -> "JobProfileOut":
        return cls(**(view.__dict__ | {"sections": _sections(view.sections)}))


@catalogue_router.get("", response_model=JobProfileListOut)
def list_job_profiles(request: Request, _: Actor = Depends(reader)) -> JobProfileListOut:
    """Toutes les fiches du catalogue, par ordre alphabétique (tout compte qui consulte les postes)."""
    views = container(request).list_job_profiles().execute()
    return JobProfileListOut(items=[JobProfileSummaryOut(**view.__dict__) for view in views])


@catalogue_router.get("/{code}", response_model=JobProfileOut)
def get_job_profile(code: str, request: Request, _: Actor = Depends(reader)) -> JobProfileOut:
    """La fiche complète et ce qu'elle propose pour le poste à publier (domaines de diplôme, niveau minimum)."""
    return JobProfileOut.of(container(request).get_job_profile().execute(code))


# --- US-801 : espace employé --------------------------------------------------------------

me_router = APIRouter(prefix="/api/me/openings", tags=["openings"])


class MyOpeningOut(BaseModel):
    id: int
    code: str
    title: str
    unit_label: str
    target_grade: str
    mission: str
    opens_on: date
    closes_on: date
    criteria_lines: list[str]
    profile_department: str | None
    competences: list[str]
    sections: list[SectionOut]
    """US-119 : la fiche complète du catalogue (vide pour un poste hors catalogue)."""

    @classmethod
    def of(cls, view: MyOpeningView) -> "MyOpeningOut":
        return cls(**(view.__dict__ | {"sections": _sections(view.sections)}))


class MyOpeningListOut(BaseModel):
    items: list[MyOpeningOut]


@me_router.get("", response_model=MyOpeningListOut)
def my_openings(request: Request, employee_id: str = Depends(current_employee_id)) -> MyOpeningListOut:
    """Les postes publiés et ouverts auxquels l'employé est apte (choix du 2026-10-11)."""
    views = container(request).list_my_openings().execute(employee_id)
    return MyOpeningListOut(items=[MyOpeningOut.of(view) for view in views])


# --- US-120 : notifications de l'employé ---------------------------------------------------

my_notifications_router = APIRouter(prefix="/api/me/notifications", tags=["notifications"])


class MyNotificationOut(BaseModel):
    key: str
    kind: str
    kind_label: str
    title: str
    detail: str
    at: datetime
    link: str
    unread: bool


class MyNotificationsOut(BaseModel):
    items: list[MyNotificationOut]
    unread_count: int
    has_more: bool


@my_notifications_router.get("", response_model=MyNotificationsOut)
def my_notifications(
    request: Request, limit: int = Query(50, ge=1, le=200), employee_id: str = Depends(current_employee_id)
) -> MyNotificationsOut:
    """Postes ouverts pour l'employé et décisions sur ses certificats, les plus récentes d'abord."""
    view = container(request).get_my_notifications().execute(employee_id, limit)
    return MyNotificationsOut(
        items=[MyNotificationOut(**item.__dict__) for item in view.items],
        unread_count=view.unread_count,
        has_more=view.has_more,
    )


@my_notifications_router.post("/read-all", status_code=204)
def mark_all_my_notifications_read(request: Request, employee_id: str = Depends(current_employee_id)) -> Response:
    container(request).mark_all_notifications_read().execute(reader_id(employee_id))
    return Response(status_code=204)


@my_notifications_router.post("/{key}/read", status_code=204)
def mark_my_notification_read(key: str, request: Request, employee_id: str = Depends(current_employee_id)) -> Response:
    container(request).mark_notification_read().execute(reader_id(employee_id), key[:100])
    return Response(status_code=204)


# --- US-902 : candidatures ----------------------------------------------------------------


class ApplyIn(BaseModel):
    motivation: str = Field("", max_length=5000)
    cv_upload_id: str | None = Field(None, max_length=64)
    cv_name: str = Field("", max_length=300)


class CvOut(BaseModel):
    name: str
    content_type: str
    size_bytes: int


class CvUploadIn(BaseModel):
    content_type: str = Field("", max_length=100)
    size_bytes: int = 0


class CvUploadOut(BaseModel):
    upload_id: str
    method: str
    url: str
    headers: dict[str, str]


class ApplicationStepOut(BaseModel):
    step: str
    step_label: str
    outcome_label: str | None
    at: datetime


class MyApplicationOut(BaseModel):
    id: int
    reference: str
    opening_id: int
    opening_code: str
    opening_title: str
    motivation: str
    received_at: datetime
    step: str
    step_label: str
    step_number: int
    outcome: str | None
    outcome_label: str | None
    can_withdraw: bool
    history: list[ApplicationStepOut]
    cv: CvOut | None

    @classmethod
    def of(cls, view: ApplicationView) -> "MyApplicationOut":
        data = {name: getattr(view, name) for name in cls.model_fields if name not in ("history", "cv")}
        history = [ApplicationStepOut(**{k: getattr(h, k) for k in ApplicationStepOut.model_fields}) for h in view.history]
        return cls(**data, history=history, cv=_cv(view))


def _cv(view: ApplicationView) -> CvOut | None:
    cv = view.cv
    return CvOut(name=cv.name, content_type=cv.content_type, size_bytes=cv.size_bytes) if cv else None


class MyApplicationListOut(BaseModel):
    items: list[MyApplicationOut]


class RhApplicationStepOut(ApplicationStepOut):
    actor_name: str


class RhApplicationOut(MyApplicationOut):
    history: list[RhApplicationStepOut]
    employee_code: str
    employee_name: str
    next_steps: list[OptionOut]
    profile_snapshot: list[str]

    @classmethod
    def of(cls, view: ApplicationView) -> "RhApplicationOut":
        skip = ("history", "next_steps", "cv", "profile_snapshot")
        data = {name: getattr(view, name) for name in cls.model_fields if name not in skip}
        return cls(
            **data,
            cv=_cv(view),
            profile_snapshot=list(view.profile_snapshot),
            history=[RhApplicationStepOut(**h.__dict__) for h in view.history],
            next_steps=[OptionOut(**step.__dict__) for step in view.next_steps],
        )


class RhApplicationListOut(BaseModel):
    items: list[RhApplicationOut]


@me_router.post("/{opening_id}/apply", response_model=MyApplicationOut, status_code=201)
def apply_to_opening(
    opening_id: int, body: ApplyIn, request: Request, employee_id: str = Depends(current_employee_id)
) -> MyApplicationOut:
    """US-902 : l'employé apte postule ; accusé de réception immédiat (RG-73)."""
    case = container(request).apply_to_opening()
    return MyApplicationOut.of(case.execute(employee_id, opening_id, body.motivation, body.cv_upload_id, body.cv_name))


my_applications_router = APIRouter(prefix="/api/me/applications", tags=["openings"])


@my_applications_router.get("", response_model=MyApplicationListOut)
def my_applications(request: Request, employee_id: str = Depends(current_employee_id)) -> MyApplicationListOut:
    """US-902 CA-02 : « Mes candidatures », avec l'étape en cours de chacune."""
    views = container(request).list_my_applications().execute(employee_id)
    return MyApplicationListOut(items=[MyApplicationOut.of(view) for view in views])


@my_applications_router.post("/cv-uploads", response_model=CvUploadOut)
def request_cv_upload(body: CvUploadIn, request: Request, employee_id: str = Depends(current_employee_id)) -> CvUploadOut:
    """Dépôt signé du CV (PDF, JPG ou PNG) ; au poste du développeur, le fichier arrive par /api/me/certificates/uploads."""
    upload = container(request).request_cv_upload().execute(employee_id, body.content_type, body.size_bytes)
    return CvUploadOut(upload_id=upload.upload_id, method=upload.ticket.method, url=upload.ticket.url, headers=upload.ticket.headers)


@my_applications_router.post("/{application_id}/withdraw", response_model=MyApplicationOut)
def withdraw_application(
    application_id: int, request: Request, employee_id: str = Depends(current_employee_id)
) -> MyApplicationOut:
    return MyApplicationOut.of(container(request).withdraw_application().execute(employee_id, application_id))


@router.get("/{opening_id}/applications", response_model=RhApplicationListOut)
def opening_applications(opening_id: int, request: Request, _: Actor = Depends(reader)) -> RhApplicationListOut:
    views = container(request).list_opening_applications().execute(opening_id)
    return RhApplicationListOut(items=[RhApplicationOut.of(view) for view in views])


admin_applications_router = APIRouter(prefix="/api/admin/applications", tags=["openings"])


class StepIn(BaseModel):
    step: str = Field("", max_length=40)


class OutcomeIn(BaseModel):
    outcome: str = Field("", max_length=40)


@admin_applications_router.post("/{application_id}/step", response_model=RhApplicationOut)
def move_application(application_id: int, body: StepIn, request: Request, actor: Actor = Depends(editor)) -> RhApplicationOut:
    """Agent RH ou Administrateur : étape suivante du circuit."""
    return RhApplicationOut.of(container(request).move_application().execute(application_id, body.step, actor))


@admin_applications_router.post("/{application_id}/close", response_model=RhApplicationOut)
def close_application(
    application_id: int, body: OutcomeIn, request: Request, actor: Actor = Depends(editor)
) -> RhApplicationOut:
    """Agent RH ou Administrateur : clôture avec une suite (acceptée, refusée, reportée)."""
    return RhApplicationOut.of(container(request).close_application().execute(application_id, body.outcome, actor))


@admin_applications_router.get("/{application_id}/cv")
def application_cv(application_id: int, request: Request, actor: Actor = Depends(reader)) -> Response:
    """Tout compte RH ouvre le CV ; chaque consultation est tracée (US-604)."""
    cv = container(request).get_application_cv().execute(application_id, actor)
    return Response(
        content=cv.content,
        media_type=cv.content_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(cv.name)}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
