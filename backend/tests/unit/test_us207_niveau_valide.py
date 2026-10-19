"""US-207 CA-04 : « Niveau d'études validé » en tête de « Mes certificats » (modèle de données §5.1 : rang le plus élevé
des certificats validés, hors des deux niveaux hors échelle)."""

from datetime import UTC, datetime

from app.certificate.domain.certificate import Certificate, CertificateStatus, validated_level


def _certificate(level, status):
    return Certificate("id", "1001", "DIPLOME", level, "T", "U", 2019, None, None, None, status, datetime(2026, 10, 9, tzinfo=UTC))


def test_aucun_certificat_valide_aucun_niveau():
    assert validated_level([_certificate("LICENCE", CertificateStatus.RECEIVED)]) is None


def test_le_rang_le_plus_eleve_des_certificats_valides():
    certificates = [
        _certificate("BACCALAUREAT", CertificateStatus.VALIDATED),
        _certificate("MASTER", CertificateStatus.RECEIVED),
        _certificate("LICENCE", CertificateStatus.VALIDATED),
    ]

    assert validated_level(certificates) == "Licence"


def test_les_niveaux_hors_echelle_ne_comptent_pas():
    certificates = [
        _certificate("CERTIFICATION_PRO", CertificateStatus.VALIDATED),
        _certificate("SECONDAIRE", CertificateStatus.VALIDATED),
    ]

    assert validated_level(certificates) == "Secondaire"
