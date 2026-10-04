from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(current_admin)])


class StatisticsOut(BaseModel):
    total: int
    updated: int
    not_updated: int
    progress: int


class EmployeeListItemOut(BaseModel):
    id: str
    employee_code: str
    last_name: str
    first_name: str
    display_name: str
    previous_name: str | None
    agency_code: str
    position: str
    status: str


class EmployeePageOut(BaseModel):
    items: list[EmployeeListItemOut]
    total: int
    page: int
    page_size: int
    page_count: int


@router.get("/statistics", response_model=StatisticsOut)
def statistics(request: Request) -> StatisticsOut:
    result = container(request).get_statistics().execute()
    return StatisticsOut(
        total=result.total, updated=result.updated, not_updated=result.not_updated, progress=result.progress
    )


@router.get("/employees", response_model=EmployeePageOut)
def list_employees(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
) -> EmployeePageOut:
    result = container(request).list_employees().execute(page=page, page_size=page_size, search=search)
    return EmployeePageOut(
        items=[EmployeeListItemOut(**item.__dict__) for item in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        page_count=result.page_count,
    )
