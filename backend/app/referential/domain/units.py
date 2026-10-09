"""US-501 : référentiel officiel des unités (EF-501 → EF-503, RG-70, RG-71).

- Une **unité** (agence, région, direction, service, siège) a un code stable qui ne change jamais (RG-70) ;
  un renommage garde l'ancien libellé.
- Une agence a **une seule région à la fois**, avec dates de début et de fin (RG-71) : le rattachement est daté.
- Une **correspondance** relie une valeur de l'export RH à une unité ; sans unité, la valeur est « À rattacher » (RG-17).
"""

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum


class UnitType(StrEnum):
    AGENCY = "AGENCE"
    REGION = "REGION"
    DIRECTION = "DIRECTION"
    SERVICE = "SERVICE"
    HEAD_OFFICE = "SIEGE"

    @property
    def label(self) -> str:
        return _TYPE_LABELS[self]


_TYPE_LABELS = {
    UnitType.AGENCY: "Agence",
    UnitType.REGION: "Région",
    UnitType.DIRECTION: "Direction",
    UnitType.SERVICE: "Service",
    UnitType.HEAD_OFFICE: "Siège",
}

PARENT_TYPE = {UnitType.AGENCY: UnitType.REGION, UnitType.SERVICE: UnitType.DIRECTION}
"""Agence → Région ; Service → Direction (modèle de données §6.4)."""

EXPORT_COLUMNS = ("agency_code", "department")
"""Colonnes de l'export RH qui désignent une unité."""

_CODE = re.compile(r"^[A-Z0-9][A-Z0-9_-]{0,19}$")


def normalize(text: str) -> str:
    """Comparaison tolérante : sans accents, sans majuscules, espaces réduits (« Région » = « region »)."""
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", text).strip().casefold()


def unit_type_from_label(value: str) -> UnitType | None:
    wanted = normalize(value)
    for unit_type in UnitType:
        if wanted in (normalize(unit_type.label), normalize(unit_type.value)):
            return unit_type
    return None


@dataclass
class Unit:
    code: str
    label: str
    type: UnitType
    former_labels: list[str] = field(default_factory=list)
    start: date | None = None
    """Date d'entrée dans le référentiel (EF-501 : statut avec dates)."""
    end: date | None = None

    def rename(self, label: str) -> bool:
        """CA-02 : le code ne change pas ; l'ancien libellé est gardé pour reconnaître les anciennes valeurs."""
        if label == self.label:
            return False
        if self.label not in self.former_labels:
            self.former_labels.append(self.label)
        self.label = label
        return True


@dataclass(frozen=True)
class Attachment:
    """CA-03 : rattachement daté ; `end` vide = en cours."""

    unit_code: str
    parent_code: str
    start: date
    end: date | None = None


@dataclass(frozen=True)
class Mapping:
    """Correspondance export → unité ; `unit_code` vide = « À rattacher »."""

    column: str
    value: str
    unit_code: str | None


# --- Fichier importé -----------------------------------------------------------------------


@dataclass(frozen=True)
class UnitRow:
    line: int
    code: str
    label: str
    type_label: str
    parent_code: str
    parent_since: date | None
    former_labels: tuple[str, ...] = ()


@dataclass(frozen=True)
class MappingRow:
    line: int
    column: str
    value: str
    unit_code: str


@dataclass(frozen=True)
class ReferentialFile:
    units: tuple[UnitRow, ...]
    mappings: tuple[MappingRow, ...]


@dataclass(frozen=True)
class Problem:
    sheet: str
    line: int
    message: str


UNITS_SHEET = "Unités"
MAPPINGS_SHEET = "Correspondances"


def check(file: ReferentialFile) -> list[Problem]:
    """CA-01 : tout ce qui rend le fichier incohérent ; le fichier n'est importé que si la liste est vide."""
    problems: list[Problem] = []
    first_line: dict[str, int] = {}
    types: dict[str, UnitType] = {}

    for row in file.units:
        unit_problem = lambda message: problems.append(Problem(UNITS_SHEET, row.line, message))  # noqa: E731
        if not _CODE.match(row.code):
            unit_problem(f"Code « {row.code} » invalide : lettres majuscules sans accents, chiffres, tiret (20 au plus).")
            continue
        if row.code in first_line:
            unit_problem(f"Code en double : {row.code} (déjà à la ligne {first_line[row.code]}).")
            continue
        first_line[row.code] = row.line
        if not row.label.strip():
            unit_problem(f"Libellé officiel manquant pour {row.code}.")
        unit_type = unit_type_from_label(row.type_label)
        if unit_type is None:
            unit_problem(f"Type « {row.type_label} » inconnu pour {row.code} : Agence, Région, Direction, Service ou Siège.")
            continue
        types[row.code] = unit_type

    for row in file.units:
        unit_type = types.get(row.code)
        if unit_type is None or first_line.get(row.code) != row.line:
            continue
        expected = PARENT_TYPE.get(unit_type)
        if unit_type is UnitType.AGENCY and not row.parent_code:
            problems.append(Problem(UNITS_SHEET, row.line, f"Agence sans région : {row.code}."))
            continue
        if not row.parent_code:
            continue
        parent_type = types.get(row.parent_code)
        if parent_type is None:
            problems.append(Problem(UNITS_SHEET, row.line, f"{row.code} est rattachée à « {row.parent_code} », absent du fichier."))
        elif expected is None:
            problems.append(Problem(UNITS_SHEET, row.line, f"Une unité de type {unit_type.label} ne se rattache à aucune autre."))
        elif parent_type is not expected:
            problems.append(
                Problem(UNITS_SHEET, row.line, f"{unit_type.label} {row.code} : rattachement attendu à une {expected.label.lower()}.")
            )

    seen: dict[tuple[str, str], int] = {}
    for row in file.mappings:
        mapping_problem = lambda message: problems.append(Problem(MAPPINGS_SHEET, row.line, message))  # noqa: E731
        if row.column not in EXPORT_COLUMNS:
            mapping_problem(f"Colonne de l'export « {row.column} » inconnue : {', '.join(EXPORT_COLUMNS)}.")
            continue
        if not row.value.strip():
            mapping_problem("Valeur de l'export manquante.")
            continue
        key = (row.column, normalize(row.value))
        if key in seen:
            mapping_problem(f"Valeur « {row.value} » en double (déjà à la ligne {seen[key]}).")
            continue
        seen[key] = row.line
        if row.unit_code and row.unit_code not in types:
            mapping_problem(f"Unité « {row.unit_code} » absente de l'onglet {UNITS_SHEET}.")

    if not file.units:
        problems.append(Problem(UNITS_SHEET, 0, "Aucune unité dans le fichier."))
    return problems
