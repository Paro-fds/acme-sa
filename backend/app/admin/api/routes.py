from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_admin)])


class EmployeeListItemOut(BaseModel):
    id: str
    employee_code: str
    last_name: str
    first_name: str
    agency_code: str
    position: str
    status: str


class EmployeePageOut(BaseModel):
    items: list[EmployeeListItemOut]
    total: int
    page: int
    page_size: int


@router.get("/employees", response_model=EmployeePageOut)
def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> EmployeePageOut:
    result = container(request).list_employees().execute(page=page, page_size=page_size)
    return EmployeePageOut(
        items=[EmployeeListItemOut(**item.__dict__) for item in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )
