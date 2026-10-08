from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.career.application.use_cases import CareerView, EntryView, KindView
from app.career.domain.entry_kinds import FieldSpec, KindSpec

router = APIRouter(prefix="/api/me/career", tags=["career"])


class ProofOut(BaseModel):
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class EntryOut(BaseModel):
    """Liste explicite des champs exposés : aucune donnée du CSV n'y figure (ENF-07)."""

    id: str
    kind: str
    qualification_type: str | None
    qualification_type_label: str | None
    title: str
    organization: str | None
    location: str | None
    start_month: str | None
    end_month: str | None
    duration_hours: int | None
    description: str | None
    skill_level: str | None
    skill_level_label: str | None
    created_at: datetime
    updated_at: datetime
    proof: ProofOut | None

    @classmethod
    def of(cls, view: EntryView) -> "EntryOut":
        fields = view.__dict__ | {"proof": ProofOut(**view.proof.__dict__) if view.proof else None}
        return cls(**fields)


class KindOut(BaseModel):
    kind: str
    label: str
    count: int
    limit: int
    items: list[EntryOut]

    @classmethod
    def of(cls, view: KindView) -> "KindOut":
        return cls(kind=view.kind, label=view.label, count=view.count, limit=view.limit, items=[EntryOut.of(item) for item in view.items])


class CareerOut(BaseModel):
    kinds: list[KindOut]
    last_changed_at: datetime | None

    @classmethod
    def of(cls, view: CareerView) -> "CareerOut":
        return cls(kinds=[KindOut.of(kind) for kind in view.kinds], last_changed_at=view.last_changed_at)


class ChoiceOut(BaseModel):
    value: str
    label: str


class ConditionOut(BaseModel):
    field: str
    value: str


class FieldOut(BaseModel):
    code: str
    label: str
    type: str
    required: bool
    min_length: int | None
    max_length: int | None
    minimum: int | None
    maximum: int | None
    choices: list[ChoiceOut]
    only_when: ConditionOut | None
    open_label: str | None

    @classmethod
    def of(cls, field: FieldSpec) -> "FieldOut":
        return cls(
            code=field.code,
            label=field.label,
            type=field.type.value,
            required=field.required,
            min_length=field.min_length,
            max_length=field.max_length,
            minimum=field.minimum,
            maximum=field.maximum,
            choices=[ChoiceOut(value=value, label=label) for value, label in field.choices],
            only_when=ConditionOut(field=field.only_when[0], value=field.only_when[1]) if field.only_when else None,
            open_label=field.open_label,
        )


class KindFieldsOut(BaseModel):
    kind: str
    label: str
    allows_proof: bool
    fields: list[FieldOut]

    @classmethod
    def of(cls, spec: KindSpec) -> "KindFieldsOut":
        return cls(
            kind=spec.kind.value, label=spec.label, allows_proof=spec.allows_proof,
            fields=[FieldOut.of(field) for field in spec.fields],
        )


class CareerFieldsOut(BaseModel):
    limit: int
    kinds: list[KindFieldsOut]


@router.get("", response_model=CareerOut)
def get_my_career(request: Request, employee_id: str = Depends(current_employee_id)) -> CareerOut:
    return CareerOut.of(container(request).get_my_career().execute(employee_id))


@router.get("/fields", response_model=CareerFieldsOut)
def get_career_fields(request: Request, _: str = Depends(current_employee_id)) -> CareerFieldsOut:
    fields = container(request).get_career_fields().execute()
    return CareerFieldsOut(limit=fields.limit, kinds=[KindFieldsOut.of(spec) for spec in fields.kinds])
