from datetime import date

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_employee_id
from app.update.api.routes import UpdateOut

router = APIRouter(prefix="/api/me", tags=["employee"])


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
    agency_code: str
    department: str
    position: str
    grade: str
    level: str
    contract_nature: str
    hire_date: date | None
    editable_fields: list[str]
    update: UpdateOut


@router.get("/profile", response_model=ProfileOut)
def get_profile(request: Request, employee_id: str = Depends(current_employee_id)) -> ProfileOut:
    profile = container(request).get_employee_profile().execute(employee_id)
    fields = {key: value for key, value in profile.__dict__.items() if key != "update"}
    return ProfileOut(**fields, update=UpdateOut.of(profile.update))
