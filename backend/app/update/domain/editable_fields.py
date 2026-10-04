"""Registre des champs modifiables par l'employé (Solution Design §7, D-03).

Ajouter ou retirer un champ se fait ici, sans toucher à la logique métier.
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum

from app.update.domain.errors import FieldNotEditable, InvalidField

REQUIRED_MESSAGE = "Ce champ est obligatoire."


class Section(StrEnum):
    IDENTITY = "IDENTITY"
    CONTACT = "CONTACT"


_NAME = re.compile(r"^[^\W\d_]+(?:[ '\-][^\W\d_]+)*$")
_PHONE_SEPARATORS = re.compile(r"[\s\-]")
_PHONE = re.compile(r"^\+?\d{8,15}$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _is_valid_name(value: str) -> bool:
    return len(value) <= 60 and bool(_NAME.match(value))


def _is_valid_phone(value: str) -> bool:
    return bool(_PHONE.match(_PHONE_SEPARATORS.sub("", value)))


def _is_valid_email(value: str) -> bool:
    return len(value) <= 254 and bool(_EMAIL.match(value))


def _is_valid_address(value: str) -> bool:
    return 5 <= len(value) <= 200


@dataclass(frozen=True)
class EditableField:
    code: str
    label: str
    section: Section
    required: bool
    is_valid: Callable[[str], bool]
    error_message: str

    def clean(self, raw: str | None) -> str:
        """Valeur nettoyée (espaces superflus retirés) ; lève InvalidField si elle est invalide."""
        value = re.sub(r"\s+", " ", raw or "").strip()
        if not value:
            if self.required:
                raise InvalidField(REQUIRED_MESSAGE, field=self.code)
            return ""
        if not self.is_valid(value):
            raise InvalidField(self.error_message, field=self.code)
        return value


EDITABLE_FIELDS: dict[str, EditableField] = {
    field.code: field
    for field in (
        EditableField(
            "last_name", "Nom", Section.IDENTITY, True, _is_valid_name,
            "Saisissez un nom valide (lettres, espaces, tirets).",
        ),
        EditableField(
            "first_name", "Prénom", Section.IDENTITY, True, _is_valid_name,
            "Saisissez un nom valide (lettres, espaces, tirets).",
        ),
        EditableField(
            "telephone_number", "Téléphone", Section.CONTACT, True, _is_valid_phone,
            "Saisissez un numéro valide, par exemple +509 3722 1111.",
        ),
        EditableField(
            "email_address", "Email", Section.CONTACT, False, _is_valid_email,
            "Saisissez une adresse email valide.",
        ),
        EditableField(
            "address_line_1", "Adresse", Section.CONTACT, False, _is_valid_address,
            "L'adresse doit contenir entre 5 et 200 caractères.",
        ),
    )
}


def editable_field(code: str) -> EditableField:
    field = EDITABLE_FIELDS.get(code)
    if field is None:
        raise FieldNotEditable(field=code)
    return field
