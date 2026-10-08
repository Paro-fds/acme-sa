from dataclasses import dataclass
from datetime import datetime

from app.career.domain.career_entry import CareerEntry, Proof, sort_entries
from app.career.domain.entry_kinds import ENTRY_KINDS, KindSpec
from app.career.domain.ports import CareerRepository


@dataclass(frozen=True)
class ProofView:
    original_name: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


@dataclass(frozen=True)
class EntryView:
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
    proof: ProofView | None


@dataclass(frozen=True)
class KindView:
    kind: str
    label: str
    count: int
    limit: int
    items: list[EntryView]


@dataclass(frozen=True)
class CareerView:
    """Parcours d'un employé : les quatre rubriques dans l'ordre du registre, chacune triée (§3.2)."""

    kinds: list[KindView]
    last_changed_at: datetime | None


def _proof_view(proof: Proof | None) -> ProofView | None:
    if proof is None:
        return None
    return ProofView(proof.original_name, proof.content_type, proof.size_bytes, proof.uploaded_at)


def entry_view(entry: CareerEntry) -> EntryView:
    return EntryView(
        id=entry.id,
        kind=entry.kind.value,
        qualification_type=entry.qualification_type.value if entry.qualification_type else None,
        qualification_type_label=entry.qualification_type.label if entry.qualification_type else None,
        title=entry.title,
        organization=entry.organization,
        location=entry.location,
        start_month=str(entry.start_month) if entry.start_month else None,
        end_month=str(entry.end_month) if entry.end_month else None,
        duration_hours=entry.duration_hours,
        description=entry.description,
        skill_level=entry.skill_level.value if entry.skill_level else None,
        skill_level_label=entry.skill_level.label if entry.skill_level else None,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        proof=_proof_view(entry.proof),
    )


def career_view(careers: CareerRepository, employee_id: str, limit: int) -> CareerView:
    """Parcours d'un employé, tel que le voient l'employé (US-25) et l'administration (US-30)."""
    entries = careers.list_for_employee(employee_id)
    kinds = []
    for kind, spec in ENTRY_KINDS.items():
        items = sort_entries(kind, [entry for entry in entries if entry.kind is kind])
        kinds.append(KindView(kind.value, spec.label, len(items), limit, [entry_view(entry) for entry in items]))
    profile = careers.profile(employee_id)
    return CareerView(kinds, profile.last_changed_at if profile else None)


class GetMyCareer:
    """US-25 : parcours de l'employé connecté, quel que soit l'état de sa mise à jour de campagne."""

    def __init__(self, careers: CareerRepository, limit: int) -> None:
        self._careers = careers
        self._limit = limit

    def execute(self, employee_id: str) -> CareerView:
        return career_view(self._careers, employee_id, self._limit)


@dataclass(frozen=True)
class CareerFields:
    limit: int
    kinds: list[KindSpec]


class GetCareerFields:
    """US-25 : registre des rubriques, pour générer les formulaires sans dupliquer les règles."""

    def __init__(self, limit: int) -> None:
        self._limit = limit

    def execute(self) -> CareerFields:
        return CareerFields(self._limit, list(ENTRY_KINDS.values()))

