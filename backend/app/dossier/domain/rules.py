"""US-202 : formats des informations saisies par l'employé (RG-10 → RG-15, D-05, D-06) et listes de choix.

Chaque message dit quoi faire, pas ce qui est interdit (RG-15).
"""

import re
from dataclasses import dataclass

from app.dossier.domain.errors import InvalidDossierField
from app.shared.domain.levels import LEVELS, Level

_SPACES = re.compile(r"\s+")
_PHONE_SEPARATORS = re.compile(r"[\s\-]")
_PHONE = re.compile(r"^(?:\+509)?(\d{8})$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

PHONE_MESSAGE = "Le numéro doit contenir 8 chiffres, par exemple +509 3712 3456."


def normalize_text(raw: str | None) -> str:
    """Espaces superflus retirés ; vide si rien n'est saisi."""
    return _SPACES.sub(" ", raw or "").strip()


def clean_phone(raw: str, *, field: str) -> str:
    """RG-10 : 8 chiffres, ou +509 suivi de 8 chiffres ; espaces et tirets ignorés. Rendu : « +509 3712 3456 »."""
    match = _PHONE.match(_PHONE_SEPARATORS.sub("", raw or ""))
    if match is None:
        raise InvalidDossierField(PHONE_MESSAGE, field=field)
    digits = match.group(1)
    return f"+509 {digits[:4]} {digits[4:]}"


def clean_email(raw: str) -> str:
    """RG-11 : format d'adresse email standard."""
    value = normalize_text(raw)
    if len(value) > 254 or not _EMAIL.match(value):
        raise InvalidDossierField("Saisissez une adresse email complète, par exemple prenom.nom@exemple.com.", field="email")
    return value


def clean_address(raw: str) -> str:
    """RG-12 : texte de 5 à 200 caractères."""
    value = normalize_text(raw)
    if len(value) < 5:
        raise InvalidDossierField("Ajoutez votre adresse complète : au moins 5 caractères.", field="address")
    if len(value) > 200:
        raise InvalidDossierField("Raccourcissez votre adresse : 200 caractères au plus.", field="address")
    return value


def clean_contact_name(raw: str) -> str:
    """RG-13 : nom du contact d'urgence, 2 à 100 caractères."""
    value = normalize_text(raw)
    if len(value) < 2:
        raise InvalidDossierField("Saisissez le nom complet de la personne à contacter.", field="contact_name")
    if len(value) > 100:
        raise InvalidDossierField("Raccourcissez le nom : 100 caractères au plus.", field="contact_name")
    return value


@dataclass(frozen=True)
class Choice:
    code: str
    label: str


RELATIONSHIPS = (
    Choice("SPOUSE", "Conjoint·e"),
    Choice("PARENT", "Parent"),
    Choice("CHILD", "Enfant"),
    Choice("SIBLING", "Frère / Sœur"),
    Choice("OTHER", "Autre"),
)
"""D-06 : lien du contact d'urgence choisi dans une liste (RG-13)."""


def clean_relationship(raw: str) -> str:
    if raw not in {choice.code for choice in RELATIONSHIPS}:
        raise InvalidDossierField("Choisissez un lien dans la liste.", field="contact_relationship")
    return raw


EducationLevel = Level

EDUCATION_LEVELS = tuple(level for level in LEVELS if level.on_scale)
"""RG-14 : niveaux de rang 1 à 8 (§7.4) ; les deux niveaux hors échelle ne sont pas proposés."""


def clean_education_level(raw: str) -> str:
    if raw not in {level.code for level in EDUCATION_LEVELS}:
        raise InvalidDossierField("Choisissez votre niveau d'études dans la liste.", field="education_level")
    return raw
