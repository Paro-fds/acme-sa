"""US-301 CA-01, CA-03, CA-04 : formats de fichier, champs obligatoires et année (RG-20 → RG-25, RG-31)."""

from datetime import date

import pytest

from app.certificate.domain.certificate import CERTIFICATE_TYPES, DOMAINS, CertificateFields, clean_fields
from app.certificate.domain.errors import InvalidCertificateField, UnsupportedCertificateFile
from app.certificate.domain.files import detect_kind

TODAY = date(2026, 10, 8)
VALID = dict(
    certificate_type="DIPLOME",
    level="LICENCE",
    title="Licence en sciences comptables",
    institution="Université d'État d'Haïti",
    year="2019",
    foreign=False,
    country="",
    domain="COMPTABILITE",
    domain_other="",
)


def _clean(**changes):
    return clean_fields(CertificateFields(**(VALID | changes)), TODAY)


def test_ca03_types_de_rg24():
    assert [(t.code, t.label) for t in CERTIFICATE_TYPES] == [
        ("DIPLOME", "Diplôme"),
        ("CERTIFICAT", "Certificat"),
        ("ATTESTATION", "Attestation"),
        ("AUTRE", "Autre"),
    ]


def test_ca03_le_domaine_se_choisit_dans_une_liste_avec_autre():
    assert DOMAINS[-1].code == "AUTRE"
    assert "COMPTABILITE" in {d.code for d in DOMAINS}


def test_un_certificat_complet_est_accepte():
    cleaned = _clean()

    assert (cleaned.level, cleaned.year, cleaned.domain, cleaned.country) == ("LICENCE", 2019, "COMPTABILITE", None)


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"certificate_type": ""}, "certificate_type"),
        ({"certificate_type": "PERMIS"}, "certificate_type"),
        ({"level": ""}, "level"),
        ({"title": " "}, "title"),
        ({"institution": ""}, "institution"),
        ({"year": ""}, "year"),
        ({"year": "19"}, "year"),
        ({"foreign": True, "country": ""}, "country"),
        ({"domain": ""}, "domain"),
        ({"domain": "AUTRE", "domain_other": ""}, "domain_other"),
        ({"domain": "ASTROLOGIE"}, "domain"),
    ],
)
def test_ca03_un_champ_obligatoire_manquant_dit_quoi_faire(changes, field):
    with pytest.raises(InvalidCertificateField) as error:
        _clean(**changes)

    assert error.value.field == field


def test_ca03_le_domaine_n_est_demande_qu_a_partir_de_bac_plus_2():
    cleaned = _clean(level="BACCALAUREAT", domain="")

    assert cleaned.domain is None


def test_ca03_pays_seulement_pour_un_diplome_etranger():
    assert _clean(foreign=True, country=" France ").country == "France"
    assert _clean(foreign=False, country="France").country is None


def test_ca04_annee_dans_le_futur_refusee():
    with pytest.raises(InvalidCertificateField) as error:
        _clean(year="2027")

    assert (error.value.field, error.value.message) == ("year", "L'année d'obtention ne peut pas être dans le futur.")
    assert _clean(year="2026").year == 2026


@pytest.mark.parametrize(
    ("head", "content_type"),
    [(b"%PDF-1.7\n", "application/pdf"), (b"\xff\xd8\xff\xe0\x00\x10JF", "image/jpeg"), (b"\x89PNG\r\n\x1a\n", "image/png")],
)
def test_ca01_pdf_jpg_png_reconnus_sur_leur_contenu(head, content_type):
    assert detect_kind(head) == content_type


@pytest.mark.parametrize("head", [b"MZ\x90\x00\x03\x00\x00\x00", b"<html><bo", b"GIF89a\x01\x00", b""])
def test_ca01_un_autre_contenu_est_refuse_meme_bien_nomme(head):
    with pytest.raises(UnsupportedCertificateFile):
        detect_kind(head)
