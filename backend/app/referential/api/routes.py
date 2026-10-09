"""US-501 : référentiel des unités, côté administration (import du fichier Excel au lot 1, D-27)."""

from datetime import date

from fastapi import APIRouter, Depends, File, Request, UploadFile
from pydantic import BaseModel

from app.auth.api.dependencies import container, current_admin, require_not_readonly
from app.referential.application.use_cases import ImportSummary, UnitView

router = APIRouter(prefix="/api/admin/referential", tags=["referential"])

MAX_FILE_BYTES = 2 * 1024 * 1024


class AttachmentOut(BaseModel):
    parent_code: str
    start: date
    end: date | None


class UnitOut(BaseModel):
    code: str
    label: str
    type: str
    type_label: str
    parent_code: str | None
    parent_label: str | None
    since: date | None
    former_labels: list[str]
    history: list[AttachmentOut]

    @classmethod
    def of(cls, view: UnitView) -> "UnitOut":
        return cls(
            code=view.code,
            label=view.label,
            type=view.type.value,
            type_label=view.type.label,
            parent_code=view.parent_code,
            parent_label=view.parent_label,
            since=view.since,
            former_labels=view.former_labels,
            history=[AttachmentOut(parent_code=a.parent_code, start=a.start, end=a.end) for a in view.history],
        )


class MappingOut(BaseModel):
    column: str
    value: str
    unit_code: str | None


class ToAttachOut(BaseModel):
    column: str
    value: str
    employees: int


class ReferentialOut(BaseModel):
    units: list[UnitOut]
    mappings: list[MappingOut]
    to_attach: list[ToAttachOut]
    """US-502 : valeurs de l'export sans unité officielle, avec le nombre d'employés concernés."""


class ImportOut(BaseModel):
    counts: dict[str, int]
    added: int
    renamed: list[str]
    moved: list[str]
    mappings: int
    unmapped: int

    @classmethod
    def of(cls, summary: ImportSummary) -> "ImportOut":
        return cls(**summary.__dict__)


@router.get("", response_model=ReferentialOut)
def get_referential(request: Request, admin_id: str = Depends(current_admin)) -> ReferentialOut:
    units, mappings = container(request).get_referential().execute()
    return ReferentialOut(
        units=[UnitOut.of(unit) for unit in units],
        mappings=[MappingOut(column=m.column, value=m.value, unit_code=m.unit_code) for m in mappings],
        to_attach=[ToAttachOut(**item.__dict__) for item in container(request).list_to_attach().execute()],
    )


@router.post("/import", response_model=ImportOut)
async def import_referential(
    request: Request, file: UploadFile = File(...), admin_id: str = Depends(require_not_readonly)
) -> ImportOut:
    content = await file.read(MAX_FILE_BYTES + 1)
    admin = container(request).get_current_admin().execute(admin_id)
    summary = container(request).import_referential().execute(
        content[: MAX_FILE_BYTES + 1], file.filename or "referentiel.xlsx", admin.username
    )
    return ImportOut.of(summary)
