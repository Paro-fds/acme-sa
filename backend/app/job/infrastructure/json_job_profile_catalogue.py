"""US-119, US-121 : catalogue des postes ACME lu depuis le fichier JSON produit par `app.tools.import_job_profiles`.

Le fichier est en lecture seule et chargé une fois ; absent, le catalogue est vide (la saisie hors catalogue reste possible).
"""

import json
from pathlib import Path

from app.job.domain.catalogue import JobProfile, ProfileSection


def _profile(data: dict) -> JobProfile:
    return JobProfile(
        code=data["code"],
        title=data["title"],
        department=data.get("department"),
        level_text=data.get("level_text"),
        description=data.get("description", ""),
        sections=tuple(ProfileSection(s["title"], tuple(s["lines"])) for s in data.get("sections", [])),
        position_code=data.get("position_code", ""),
        service=data.get("service"),
        competences=tuple(data.get("competences", [])),
    )


class JsonJobProfileCatalogue:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._profiles: dict[str, JobProfile] | None = None

    def _load(self) -> dict[str, JobProfile]:
        if self._profiles is None:
            if self._path.is_file():
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._profiles = {p.code: p for p in map(_profile, data.get("profiles", []))}
            else:
                self._profiles = {}
        return self._profiles

    def list_all(self) -> list[JobProfile]:
        return list(self._load().values())

    def get(self, code: str) -> JobProfile | None:
        return self._load().get(code)
