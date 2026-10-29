"""US-119, US-121 : consulter le catalogue des postes ACME et pré-remplir un poste à publier à partir d'un poste."""

import unicodedata
from dataclasses import dataclass

from app.job.domain.catalogue import JobProfile, JobProfileCatalogue, ProfileSection, diploma_domains, suggest_level
from app.job.domain.errors import JobProfileNotFound


@dataclass(frozen=True)
class JobProfileSummary:
    code: str
    position_code: str
    title: str
    department: str | None
    service: str | None
    level_text: str | None


@dataclass(frozen=True)
class JobProfileView:
    code: str
    position_code: str
    title: str
    department: str | None
    service: str | None
    competences: tuple[str, ...]
    level_text: str | None
    description: str
    sections: tuple[ProfileSection, ...]
    suggested_domains: list[str]
    suggested_level: str | None


def _sort_key(profile: JobProfile) -> str:
    return unicodedata.normalize("NFKD", profile.title).encode("ascii", "ignore").decode().lower()


class ListJobProfiles:
    """CA-01 : toutes les fiches, par ordre alphabétique de l'intitulé."""

    def __init__(self, catalogue: JobProfileCatalogue) -> None:
        self._catalogue = catalogue

    def execute(self) -> list[JobProfileSummary]:
        return [
            JobProfileSummary(p.code, p.position_code, p.title, p.department, p.service, p.level_text)
            for p in sorted(self._catalogue.list_all(), key=_sort_key)
        ]


class GetJobProfile:
    """CA-02, CA-03 : la fiche complète, avec les domaines de diplôme (par département, US-121) et le niveau minimum qu'elle propose."""

    def __init__(self, catalogue: JobProfileCatalogue) -> None:
        self._catalogue = catalogue

    def execute(self, code: str) -> JobProfileView:
        profile = self._catalogue.get(code)
        if profile is None:
            raise JobProfileNotFound()
        return JobProfileView(
            code=profile.code,
            position_code=profile.position_code,
            title=profile.title,
            department=profile.department,
            service=profile.service,
            competences=profile.competences,
            level_text=profile.level_text,
            description=profile.description,
            sections=profile.sections,
            suggested_domains=list(diploma_domains(profile.department)),
            suggested_level=suggest_level(profile.level_text),
        )
