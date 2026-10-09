"""US-301 : un certificat déposé par l'employé (modèle de données §5.1, §5.2 ; RG-22 → RG-26, RG-31 ; D-04, D-07)."""

from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum

from app.certificate.domain.errors import InvalidCertificateField
from app.shared.domain.levels import LEVELS, LEVELS_BY_CODE


@dataclass(frozen=True)
class Choice:
    code: str
    label: str


CERTIFICATE_TYPES = (
    Choice("DIPLOME", "Diplôme"),
    Choice("CERTIFICAT", "Certificat"),
    Choice("ATTESTATION", "Attestation"),
    Choice("AUTRE", "Autre"),
)
"""RG-24 : les types du portail actuel, déjà connus des employés."""

DOMAINS = (
    Choice("COMPTABILITE", "Comptabilité"),
    Choice("GESTION", "Gestion"),
    Choice("FINANCE", "Finance"),
    Choice("BANQUE_MICROFINANCE", "Banque et microfinance"),
    Choice("ECONOMIE", "Économie"),
    Choice("INFORMATIQUE", "Informatique"),
    Choice("DROIT", "Droit"),
    Choice("RESSOURCES_HUMAINES", "Ressources humaines"),
    Choice("MARKETING_COMMERCE", "Marketing et commerce"),
    Choice("STATISTIQUES", "Statistiques"),
    Choice("AGRONOMIE", "Agronomie"),
    Choice("AUTRE", "Autre (à préciser)"),
)
"""RG-31 : liste fermée avec « Autre ». ❓ Liste de départ du développeur (le registre ne cite que Comptabilité, Gestion,
Finance, Informatique) : à valider par la DRH (D-45)."""

DOMAIN_FROM_RANK = 5
"""RG-23, RG-31 : le domaine est obligatoire à partir de Bac + 2 (rang 5)."""

TYPE_LABELS = {choice.code: choice.label for choice in CERTIFICATE_TYPES}
DOMAIN_LABELS = {choice.code: choice.label for choice in DOMAINS}


def needs_domain(level_code: str) -> bool:
    level = LEVELS_BY_CODE.get(level_code)
    return bool(level and level.rank and level.rank >= DOMAIN_FROM_RANK)


class CertificateStatus(StrEnum):
    """RG-26 : Reçu / En vérification → Validé, ou À corriger."""

    RECEIVED = "RECEIVED"
    IN_REVIEW = "IN_REVIEW"
    VALIDATED = "VALIDATED"
    TO_CORRECT = "TO_CORRECT"


STATUS_LABELS = {
    CertificateStatus.RECEIVED: "Reçu",
    CertificateStatus.IN_REVIEW: "En vérification",
    CertificateStatus.VALIDATED: "Validé",
    CertificateStatus.TO_CORRECT: "À corriger",
}


@dataclass(frozen=True)
class CertificateFields:
    """Ce que l'employé saisit, tel quel."""

    certificate_type: str
    level: str
    title: str
    institution: str
    year: str
    foreign: bool
    country: str
    domain: str
    domain_other: str


@dataclass(frozen=True)
class CleanFields:
    certificate_type: str
    level: str
    title: str
    institution: str
    year: int
    country: str | None
    domain: str | None
    domain_other: str | None


@dataclass(frozen=True)
class Certificate:
    id: str
    employee_id: str
    certificate_type: str
    level: str
    title: str
    institution: str
    year: int
    country: str | None
    domain: str | None
    domain_other: str | None
    status: CertificateStatus
    submitted_at: datetime


@dataclass(frozen=True)
class CertificateFile:
    """§5.2 : la base ne garde que la description ; le fichier est dans le stockage privé, sous un nom aléatoire."""

    certificate_id: str
    storage_key: str
    original_name: str
    content_type: str
    size_bytes: int


def _text(value: str) -> str:
    return " ".join((value or "").split())


def _required_text(value: str, field: str, message: str, maximum: int = 150) -> str:
    text = _text(value)
    if len(text) < 2:
        raise InvalidCertificateField(message, field=field)
    if len(text) > maximum:
        raise InvalidCertificateField(f"Raccourcissez ce texte : {maximum} caractères au plus.", field=field)
    return text


def clean_fields(fields: CertificateFields, today: date) -> CleanFields:
    """CA-03 : type, niveau, intitulé, établissement, année ; pays si étranger ; domaine à partir de Bac + 2.
    CA-04 : année pas dans le futur. Chaque message dit quoi faire (RG-15)."""
    if fields.certificate_type not in TYPE_LABELS:
        raise InvalidCertificateField("Choisissez le type de document.", field="certificate_type")
    if fields.level not in LEVELS_BY_CODE:
        raise InvalidCertificateField("Choisissez le niveau du certificat.", field="level")
    title = _required_text(fields.title, "title", "Indiquez l'intitulé du diplôme ou du certificat.")
    institution = _required_text(fields.institution, "institution", "Indiquez l'établissement qui l'a délivré.")
    year_text = _text(fields.year)
    if not (year_text.isdigit() and len(year_text) == 4):
        raise InvalidCertificateField("Indiquez l'année d'obtention, en 4 chiffres (par exemple 2019).", field="year")
    year = int(year_text)
    if year > today.year:
        raise InvalidCertificateField("L'année d'obtention ne peut pas être dans le futur.", field="year")
    country = None
    if fields.foreign:
        country = _required_text(fields.country, "country", "Indiquez le pays où le diplôme a été obtenu.", 80)
    domain = domain_other = None
    if needs_domain(fields.level):
        if not fields.domain:
            raise InvalidCertificateField("Choisissez le domaine du diplôme.", field="domain")
        if fields.domain not in DOMAIN_LABELS:
            raise InvalidCertificateField("Choisissez un domaine dans la liste.", field="domain")
        domain = fields.domain
        if domain == "AUTRE":
            domain_other = _required_text(fields.domain_other, "domain_other", "Précisez le domaine.", 80)
    return CleanFields(fields.certificate_type, fields.level, title, institution, year, country, domain, domain_other)


LEVEL_LABELS = {level.code: level.label for level in LEVELS}


RATINGS = {1: "Difficile", 2: "Correct", 3: "Facile"}
"""US-302 CA-03 : la question en un clic après le dépôt (« plaisir », cahier §2.3) ; jamais de commentaire libre (US-605)."""


@dataclass(frozen=True)
class Feedback:
    employee_id: str
    certificate_id: str
    rating: int
    at: datetime


SEARCHABLE = "Une fois validé, vous apparaissez dans les recherches des RH pour les promotions et les postes à pourvoir."
"""US-302 CA-02, D-10 : ce que le certificat débloque avant le lot 4."""


def unlocked_level(level_code: str) -> str | None:
    """Le niveau d'études que le certificat validera ; aucun pour les deux niveaux hors échelle (§7.4)."""
    level = LEVELS_BY_CODE.get(level_code)
    return level.label if level and level.on_scale else None


def validated_level(certificates: "list[Certificate]") -> str | None:
    """Niveau d'études validé : le rang le plus élevé des certificats validés, hors échelle exclus (§5.1)."""
    ranked = [
        LEVELS_BY_CODE[c.level]
        for c in certificates
        if c.status == CertificateStatus.VALIDATED and LEVELS_BY_CODE[c.level].on_scale
    ]
    return max(ranked, key=lambda level: level.rank).label if ranked else None
