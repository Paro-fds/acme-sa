"""US-202 CA-02, CA-04 : formats des coordonnées (RG-10 → RG-15, D-05, D-06) et listes de choix."""

import pytest

from app.dossier.domain.errors import InvalidDossierField
from app.dossier.domain.rules import (
    EDUCATION_LEVELS,
    RELATIONSHIPS,
    clean_address,
    clean_contact_name,
    clean_education_level,
    clean_email,
    clean_phone,
    clean_relationship,
)

# --- RG-10 : téléphone --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("37121234", "+509 3712 1234"),
        ("3712 1234", "+509 3712 1234"),
        ("3712-1234", "+509 3712 1234"),
        ("+509 3712 1234", "+509 3712 1234"),
        ("+50937121234", "+509 3712 1234"),
        ("  +509 3722-7777 ", "+509 3722 7777"),
    ],
)
def test_ca02_telephone_8_chiffres_ou_509_suivi_de_8_chiffres(raw, expected):
    assert clean_phone(raw, field="telephone") == expected


@pytest.mark.parametrize("raw", ["3712", "371212345", "+33 6 12 34 56 78", "+509 3712", "3712abcd", "509 37121234"])
def test_ca02_un_telephone_invalide_dit_quoi_faire(raw):
    with pytest.raises(InvalidDossierField) as error:
        clean_phone(raw, field="telephone")

    assert error.value.field == "telephone"
    assert error.value.message == "Le numéro doit contenir 8 chiffres, par exemple +509 3712 3456."


# --- RG-11, RG-12 : email et adresse --------------------------------------------------------------


def test_ca02_email_au_format_standard():
    assert clean_email(" Jean.Joseph@Exemple.test ") == "Jean.Joseph@Exemple.test"
    with pytest.raises(InvalidDossierField) as error:
        clean_email("jean.joseph@exemple")
    assert (error.value.field, error.value.message) == (
        "email",
        "Saisissez une adresse email complète, par exemple prenom.nom@exemple.com.",
    )


def test_ca02_adresse_de_5_a_200_caracteres():
    assert clean_address("  12   rue Capois ") == "12 rue Capois"
    assert clean_address("a" * 200) == "a" * 200
    with pytest.raises(InvalidDossierField, match="au moins 5 caractères"):
        clean_address("Rue")
    with pytest.raises(InvalidDossierField, match="200 caractères au plus"):
        clean_address("a" * 201)


# --- RG-13, D-06 : contact d'urgence ---------------------------------------------------------------


def test_ca04_lien_choisi_dans_la_liste_de_d06():
    assert [(item.code, item.label) for item in RELATIONSHIPS] == [
        ("SPOUSE", "Conjoint·e"),
        ("PARENT", "Parent"),
        ("CHILD", "Enfant"),
        ("SIBLING", "Frère / Sœur"),
        ("OTHER", "Autre"),
    ]
    assert clean_relationship("SIBLING") == "SIBLING"
    with pytest.raises(InvalidDossierField) as error:
        clean_relationship("Cousin")
    assert (error.value.field, error.value.message) == ("contact_relationship", "Choisissez un lien dans la liste.")


def test_nom_du_contact_de_2_a_100_caracteres():
    assert clean_contact_name(" Jean  Baptiste Pierre ") == "Jean Baptiste Pierre"
    with pytest.raises(InvalidDossierField, match="nom complet"):
        clean_contact_name("J")
    with pytest.raises(InvalidDossierField, match="100 caractères au plus"):
        clean_contact_name("a" * 101)


# --- RG-14 : niveau d'études, rangs 1 à 8 (§7.4) -----------------------------------------------------


def test_niveaux_de_rang_1_a_8_sans_les_niveaux_hors_echelle():
    assert [(level.rank, level.label) for level in EDUCATION_LEVELS] == [
        (1, "Primaire / Fondamental"),
        (2, "Secondaire"),
        (3, "Baccalauréat"),
        (4, "Formation professionnelle / Technique"),
        (5, "Technicien supérieur / Bac + 2"),
        (6, "Licence"),
        (7, "Master"),
        (8, "Doctorat"),
    ]
    assert clean_education_level("LICENCE") == "LICENCE"
    with pytest.raises(InvalidDossierField) as error:
        clean_education_level("CERTIFICATION")
    assert (error.value.field, error.value.message) == (
        "education_level",
        "Choisissez votre niveau d'études dans la liste.",
    )
