"""US-119 : consulter le catalogue des postes ACME et pré-remplir un poste à publier à partir d'une fiche."""

import unicodedata
from dataclasses import dataclass

from app.job.domain.catalogue import JobProfile, JobProfileCatalogue, ProfileSection, diploma_domains, suggest_level
from app.job.domain.errors import JobProfileNotFound


@dataclass(frozen=True)
class JobProfileSummary:
    code: str
    title: str
    domain: str | None
    level_text: str | None


@dataclass(frozen=True)
class JobProfileView:
    code: str
    title: str
    domain: str | None
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
            JobProfileSummary(p.code, p.title, p.domain, p.level_text)
            for p in sorted(self._catalogue.list_all(), key=_sort_key)
        ]


class GetJobProfile:
    """CA-02, CA-03 : la fiche complète, avec les domaines de diplôme et le niveau minimum qu'elle propose."""

    def __init__(self, catalogue: JobProfileCatalogue) -> None:
        self._catalogue = catalogue

    def execute(self, code: str) -> JobProfileView:
        profile = self._catalogue.get(code)
        if profile is None:
            raise JobProfileNotFound()
        return JobProfileView(
            code=profile.code,
            title=profile.title,
            domain=profile.domain,
            level_text=profile.level_text,
            description=profile.description,
            sections=profile.sections,
            suggested_domains=list(diploma_domains(profile.domain)),
            suggested_level=suggest_level(profile.level_text),
        )
