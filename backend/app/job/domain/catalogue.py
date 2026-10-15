"""US-119, US-121 : catalogue des postes ACME.

- US-121 : un poste par ligne de la matrice des postes du directeur (base SQLite, source de vérité) : code de la matrice
  (vide pour un poste qui n'en a pas), intitulé, département, service, compétences.
- Une description de poste de même intitulé (US-119) complète le poste : description et rubriques dans un modèle unique
  (SECTION_TITLES), niveau demandé.
- Le niveau demandé se résume (« Bac + 4 ») et suggère le niveau minimum du poste à publier ; les RH ajustent.
- Le département du poste propose des domaines de diplôme pour la visibilité du poste (DIPLOMA_DOMAINS) : « le
  département a le même sens que le domaine » (utilisateur, 2026-10-15).
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Protocol

SECTION_TITLES = ("Missions", "Qualifications", "Expérience", "Conditions d'exercice", "Qualités attendues")

DIPLOMA_DOMAINS: dict[str, tuple[str, ...]] = {
    "Administration": ("GESTION",),
    "Audit interne": ("COMPTABILITE", "FINANCE", "GESTION"),
    "Crédit": ("BANQUE_MICROFINANCE", "FINANCE", "GESTION"),
    "Finance": ("FINANCE", "COMPTABILITE", "ECONOMIE"),
    "Informatique": ("INFORMATIQUE",),
    "Juridique": ("DROIT",),
    "Marketing": ("MARKETING_COMMERCE",),
    "Opérations": ("BANQUE_MICROFINANCE", "COMPTABILITE", "GESTION"),
    "Recouvrement": ("BANQUE_MICROFINANCE", "GESTION"),
    "Ressources humaines": ("RESSOURCES_HUMAINES", "GESTION"),
    "Risques et conformité": ("FINANCE", "BANQUE_MICROFINANCE", "DROIT", "STATISTIQUES"),
}
"""Départements de la matrice → domaines de diplôme. ❓ Proposition du développeur (2026-10-15), à valider par la DRH.
« Direction générale » ne propose rien : les RH choisissent."""

def _plain(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


def diploma_domains(department: str | None) -> tuple[str, ...]:
    """Domaines de diplôme proposés pour un poste de ce département (sans tenir compte des accents ni des majuscules)."""
    if not department:
        return ()
    wanted = _plain(department)
    return next((codes for label, codes in DIPLOMA_DOMAINS.items() if _plain(label) == wanted), ())


_BAC_PLUS = re.compile(r"\bbac\s*\+\s*(\d)")
_WORDS = (("doctorat", "Doctorat"), ("master", "Master"), ("licence", "Licence"))


def describe_level(lines: list[str]) -> str | None:
    """Le niveau demandé, résumé à partir des qualifications : « Bac + 4 ou Bac + 5 », « Baccalauréat », « Licence »…
    `None` si aucune ligne ne cite de diplôme reconnu (« Non précisé »)."""
    for line in lines:
        plain = _plain(line)
        years = list(dict.fromkeys(_BAC_PLUS.findall(plain)))
        if years:
            return " ou ".join(f"Bac + {year}" for year in years)
        if "premier cycle" in plain:
            return "Licence"
        for word, label in _WORDS:
            if re.search(rf"\b{word}\b", plain):
                return label
        if re.search(r"\bbac\b|baccalaureat", plain):
            return "Baccalauréat"
        if "diplome universitaire" in plain:
            return "Diplôme universitaire"
        if "etudes superieures" in plain:
            return "Études supérieures"
    return None


def suggest_level(level_text: str | None) -> str | None:
    """Niveau minimum suggéré (code de l'échelle) : le plus bas des niveaux cités par la fiche."""
    if not level_text:
        return None
    plain = _plain(level_text)
    years = [int(year) for year in _BAC_PLUS.findall(plain)]
    if years:
        lowest = min(years)
        return "MASTER" if lowest >= 5 else "LICENCE" if lowest >= 3 else "BAC_PLUS_2" if lowest == 2 else "BACCALAUREAT"
    # « Diplôme universitaire » : une licence au moins ; « Études supérieures » reste au choix des RH.
    for word, code in (
        ("licence", "LICENCE"), ("universitaire", "LICENCE"), ("master", "MASTER"), ("doctorat", "DOCTORAT"),
        ("bac", "BACCALAUREAT"),
    ):
        if word in plain:
            return code
    return None


@dataclass(frozen=True)
class ProfileSection:
    title: str
    lines: tuple[str, ...]


@dataclass(frozen=True)
class JobProfile:
    code: str
    """Clé du poste dans le catalogue : le code de la matrice, ou l'intitulé simplifié pour un poste sans code."""
    title: str
    department: str | None
    level_text: str | None
    description: str
    sections: tuple[ProfileSection, ...]
    position_code: str = ""
    """US-121 : code du poste dans la matrice du directeur (vide s'il n'en a pas)."""
    service: str | None = None
    competences: tuple[str, ...] = ()


class JobProfileCatalogue(Protocol):
    def list_all(self) -> list[JobProfile]: ...

    def get(self, code: str) -> JobProfile | None: ...
