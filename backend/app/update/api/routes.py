from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.auth.api.dependencies import container, current_employee_id
from app.update.application.use_cases import FieldView, UpdateView

router = APIRouter(prefix="/api/me/update", tags=["update"])


class ChangeOut(BaseModel):
    field_name: str
    label: str
    section: str
    old_value: str
    new_value: str
    changed_at: datetime


class UpdateOut(BaseModel):
    state: str
    accepted: bool | None
    created_at: datetime | None
    updated_at: datetime | None
    submitted_at: datetime | None
    changes: list[ChangeOut]

    @classmethod
    def of(cls, view: UpdateView) -> "UpdateOut":
        return cls(
            state=view.state,
            accepted=view.accepted,
            created_at=view.created_at,
            updated_at=view.updated_at,
            submitted_at=view.submitted_at,
            changes=[ChangeOut(**change.__dict__) for change in view.changes],
        )


class FieldOut(BaseModel):
    code: str
    label: str
    section: str
    required: bool
    original_value: str
    value: str
    modified: bool

    @classmethod
    def of(cls, view: FieldView) -> "FieldOut":
        return cls(**view.__dict__, modified=view.modified)


class DecisionIn(BaseModel):
    accepted: bool


class ChangesIn(BaseModel):
    changes: dict[str, str] = Field(max_length=20)


class SubmitIn(BaseModel):
    confirmed: bool = False


@router.get("", response_model=UpdateOut)
def get_my_update(request: Request, employee_id: str = Depends(current_employee_id)) -> UpdateOut:
    return UpdateOut.of(container(request).get_my_update().execute(employee_id))


@router.get("/fields", response_model=list[FieldOut])
def get_fields(request: Request, employee_id: str = Depends(current_employee_id)) -> list[FieldOut]:
    return [FieldOut.of(field) for field in container(request).get_editable_fields().execute(employee_id)]


@router.post("/decision", response_model=UpdateOut)
def record_decision(
    payload: DecisionIn, request: Request, employee_id: str = Depends(current_employee_id)
) -> UpdateOut:
    return UpdateOut.of(container(request).record_decision().execute(employee_id, payload.accepted))


@router.put("/changes", response_model=UpdateOut)
def save_changes(payload: ChangesIn, request: Request, employee_id: str = Depends(current_employee_id)) -> UpdateOut:
    return UpdateOut.of(container(request).save_draft().execute(employee_id, payload.changes))


@router.post("/submit", response_model=UpdateOut)
def submit(payload: SubmitIn, request: Request, employee_id: str = Depends(current_employee_id)) -> UpdateOut:
    return UpdateOut.of(container(request).submit_update().execute(employee_id, payload.confirmed))
