"""US-09 — Règles de validation du registre des champs modifiables (T-09.1)."""

import pytest

from app.update.domain.editable_fields import EDITABLE_FIELDS, REQUIRED_MESSAGE, editable_field
from app.update.domain.errors import FieldNotEditable, InvalidField

NAME_MESSAGE = "Saisissez un nom valide (lettres, espaces, tirets)."
PHONE_MESSAGE = "Saisissez un numéro valide, par exemple +509 3722 1111."
EMAIL_MESSAGE = "Saisissez une adresse email valide."
ADDRESS_MESSAGE = "L'adresse doit contenir entre 5 et 200 caractères."


def test_registry_contains_exactly_the_five_editable_fields():
    assert list(EDITABLE_FIELDS) == ["last_name", "first_name", "telephone_number", "email_address", "address_line_1"]


@pytest.mark.parametrize("code", ["last_name", "first_name"])
@pytest.mark.parametrize("value", ["JOSEPH", "Jean-Pierre", "D'Haïti", "Saint Fleur", "ÉTIENNE", "a" * 60])
def test_valid_names(code, value):
    assert editable_field(code).clean(value) == value


@pytest.mark.parametrize("code", ["last_name", "first_name"])
@pytest.mark.parametrize("value", ["Jean2", "Jean_", "Jean@", "-Jean", "Jean--Pierre", "a" * 61])
def test_invalid_names(code, value):
    with pytest.raises(InvalidField) as error:
        editable_field(code).clean(value)
    assert error.value.message == NAME_MESSAGE
    assert error.value.field == code


@pytest.mark.parametrize("value", ["+50937221111", "+509 3722 1111", "3722-1111", "37221111", "123456789012345"])
def test_valid_phones(value):
    assert editable_field("telephone_number").clean(value) == value


@pytest.mark.parametrize("value", ["12ab", "1234567", "1234567890123456", "++50937221111", "509+37221111"])
def test_invalid_phones(value):
    with pytest.raises(InvalidField) as error:
        editable_field("telephone_number").clean(value)
    assert error.value.message == PHONE_MESSAGE


@pytest.mark.parametrize("value", ["jean.joseph@exemple.test", "a@b.ht"])
def test_valid_emails(value):
    assert editable_field("email_address").clean(value) == value


@pytest.mark.parametrize("value", ["jean", "jean@", "jean@exemple", "jean joseph@exemple.test", "a@b." + "c" * 251])
def test_invalid_emails(value):
    with pytest.raises(InvalidField) as error:
        editable_field("email_address").clean(value)
    assert error.value.message == EMAIL_MESSAGE


@pytest.mark.parametrize("value", ["12 rue", "a" * 200])
def test_valid_addresses(value):
    assert editable_field("address_line_1").clean(value) == value


@pytest.mark.parametrize("value", ["rue", "a" * 201])
def test_invalid_addresses(value):
    with pytest.raises(InvalidField) as error:
        editable_field("address_line_1").clean(value)
    assert error.value.message == ADDRESS_MESSAGE


@pytest.mark.parametrize("code", ["last_name", "first_name", "telephone_number"])
@pytest.mark.parametrize("value", ["", "   ", None])
def test_ca06_required_fields_cannot_be_emptied(code, value):
    with pytest.raises(InvalidField) as error:
        editable_field(code).clean(value)
    assert error.value.message == REQUIRED_MESSAGE == "Ce champ est obligatoire."


@pytest.mark.parametrize("code", ["email_address", "address_line_1"])
def test_optional_fields_can_be_emptied(code):
    assert editable_field(code).clean("  ") == ""


def test_extra_spaces_are_removed():
    assert editable_field("address_line_1").clean("  12   rue  Capois ") == "12 rue Capois"


@pytest.mark.parametrize("code", ["position", "debt_amount", "birth_date", "employee_code"])
def test_ca07_fields_outside_the_registry_are_not_editable(code):
    with pytest.raises(FieldNotEditable):
        editable_field(code)
