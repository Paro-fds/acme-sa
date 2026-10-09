"""Schémas de la mise à jour du MVP, encore lus par les écrans RH et le profil (code hérité, US-206)."""

from datetime import datetime

from pydantic import BaseModel

from app.update.application.use_cases import UpdateView


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
    reopened: bool
    changes: list[ChangeOut]

    @classmethod
    def of(cls, view: UpdateView) -> "UpdateOut":
        return cls(
            state=view.state,
            accepted=view.accepted,
            created_at=view.created_at,
            updated_at=view.updated_at,
            submitted_at=view.submitted_at,
            reopened=view.reopened,
            changes=[ChangeOut(**change.__dict__) for change in view.changes],
        )
