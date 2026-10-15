"""US-119 : catalogue des postes ACME, une fiche par description de poste de l'entreprise.

- Une fiche : code, intitulé, domaine (tableau poste → domaine de l'utilisateur), niveau demandé, description et
  rubriques dans un modèle unique (SECTION_TITLES), quelle que soit la mise en page d'origine.
- Le niveau demandé se résume (« Bac + 4 ») et suggère le niveau minimum du poste à publier ; les RH ajustent.
- Le domaine de la fiche propose des domaines de diplôme pour la visibilité du poste (DIPLOMA_DOMAINS).
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Protocol

SECTION_TITLES = ("Missions", "Qualifications", "Expérience", "Conditions d'exercice", "Qualités attendues")

DIPLOMA_DOMAINS: dict[str, tuple[str, ...]] = {
    "Comptabilité": ("COMPTABILITE", "FINANCE"),
    "Finance": ("FINANCE", "COMPTABILITE", "ECONOMIE"),
    "Banque et microfinance": ("BANQUE_MICROFINANCE", "FINANCE", "GESTION"),
    "Recouvrement": ("BANQUE_MICROFINANCE", "GESTION"),
    "Gestion des risques": ("FINANCE", "BANQUE_MICROFINANCE", "STATISTIQUES"),
    "Audit": ("COMPTABILITE", "FINANCE", "GESTION"),
    "Audit et contrôle": ("COMPTABILITE", "FINANCE", "GESTION"),
    "Informatique": ("INFORMATIQUE",),
    "Ressources humaines": ("RESSOURCES_HUMAINES", "GESTION"),
    "Droit": ("DROIT",),
    "Droit et conformité": ("DROIT",),
    "Économie et statistiques": ("ECONOMIE", "STATISTIQUES"),
    "Marketing": ("MARKETING_COMMERCE",),
    "Communication": ("MARKETING_COMMERCE",),
    "Relation client": ("MARKETING_COMMERCE",),
    "Administration": ("GESTION",),
}
"""❓ Proposition du développeur (2026-10-14), à valider par la DRH. Les autres domaines (Management, Sécurité,
Transport, Logistique, Services généraux, Archivistique) ne proposent rien : les RH choisissent."""


def _plain(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()


def diploma_domains(domain: str | None) -> tuple[str, ...]:
    """Domaines de diplôme proposés pour une fiche de ce domaine (sans tenir compte des accents ni des majuscules)."""
    if not domain:
        return ()
    wanted = _plain(domain)
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
    title: str
    domain: str | None
    level_text: str | None
    description: str
    sections: tuple[ProfileSection, ...]


class JobProfileCatalogue(Protocol):
    def list_all(self) -> list[JobProfile]: ...

    def get(self, code: str) -> JobProfile | None: ...
