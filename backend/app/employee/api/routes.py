from datetime import date

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.employee.domain.completion import ELEMENTS
from app.update.api.schemas import UpdateOut

router = APIRouter(prefix="/api/me", tags=["employee"])


class AffectationOut(BaseModel):
    """US-201 : libellés officiels ; null = « Unité à confirmer »."""

    agency: str | None
    region: str | None
    direction: str | None


class ElementOut(BaseModel):
    key: str
    label: str
    complete: bool


class CompletionOut(BaseModel):
    """US-201 CA-02 : « Votre dossier est complet à X % »."""

    percent: int
    complete: int
    total: int
    is_complete: bool
    """US-204 : profil complet (les 8 éléments) ; il ouvre le dépôt de certificats (RG-06, RG-07)."""
    elements: list[ElementOut]

    @classmethod
    def of(cls, value) -> "CompletionOut":
        return cls(
            percent=value.percent,
            complete=value.complete,
            total=value.total,
            is_complete=value.is_complete,
            elements=[ElementOut(key=e.key, label=e.label, complete=e.key in value.done) for e in ELEMENTS],
        )


class ProfileOut(BaseModel):
    """Liste explicite des champs exposés : aucune autre donnée de la source ne peut sortir (ENF-07)."""

    employee_code: str
    last_name: str
    first_name: str
    gender: str
    birth_date: date
    telephone_number: str
    email_address: str
    address_line_1: str
    affectation: AffectationOut
    position: str
    grade: str
    level: str
    contract_nature: str
    hire_date: date | None
    editable_fields: list[str]
    update: UpdateOut
    completion: CompletionOut


@router.get("/profile", response_model=ProfileOut)
def get_profile(request: Request, employee_id: str = Depends(current_employee_id)) -> ProfileOut:
    profile = container(request).get_employee_profile().execute(employee_id)
    fields = {key: value for key, value in profile.__dict__.items() if key not in ("update", "affectation", "completion")}
    affectation = AffectationOut(
        agency=profile.affectation.agency, region=profile.affectation.region, direction=profile.affectation.direction
    )
    return ProfileOut(
        **fields, affectation=affectation, update=UpdateOut.of(profile.update), completion=CompletionOut.of(profile.completion)
    )
