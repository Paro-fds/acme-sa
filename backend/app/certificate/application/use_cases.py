"""US-301 : déposer un certificat (EF-301, EF-302, EF-308) ; US-303 : le suivre (EF-303)."""

import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime

from app.certificate.domain.certificate import (
    CERTIFICATE_TYPES,
    DOMAIN_LABELS,
    DOMAINS,
    LEVEL_LABELS,
    STATUS_LABELS,
    TYPE_LABELS,
    Certificate,
    CertificateFields,
    CertificateFile,
    CertificateStatus,
    RATINGS,
    SEARCHABLE,
    Choice,
    Feedback,
    clean_fields,
    unlocked_level,
    validated_level,
    needs_domain,
)
from app.certificate.domain.errors import (
    CertificateFileTooLarge,
    CertificateNotFound,
    InvalidRating,
    LocalUploadsUnavailable,
    ProfileIncomplete,
    TooManyCertificates,
    UploadNotFound,
)
from app.certificate.domain.files import SIGNATURE_LENGTH, check_announced_type, clean_original_name, detect_kind
from app.certificate.domain.ports import CertificateRepository, CertificateStorage, ProfileStatus, UploadTicket
from app.shared.domain.clock import Clock
from app.shared.domain.levels import LEVELS

_UPLOAD_ID = re.compile(r"^[0-9a-f]{32}$")


def storage_key(employee_id: str, upload_id: str) -> str:
    """CA-05 : nom aléatoire, dans le dossier de l'employé ; un employé ne peut désigner que ses propres dépôts."""
    if not _UPLOAD_ID.match(upload_id or ""):
        raise UploadNotFound()
    return f"certificates/{employee_id}/{upload_id}"


@dataclass(frozen=True)
class Limits:
    max_bytes: int
    max_certificates: int


@dataclass(frozen=True)
class LevelChoice:
    code: str
    label: str
    examples: str
    needs_domain: bool
    on_scale: bool
    """Compte dans le niveau d'études (les deux niveaux hors échelle n'y comptent pas)."""


@dataclass(frozen=True)
class CertificateForm:
    types: tuple[Choice, ...]
    levels: tuple[LevelChoice, ...]
    domains: tuple[Choice, ...]
    max_mb: int
    limit: int


class GetCertificateForm:
    def __init__(self, limits: Limits) -> None:
        self._limits = limits

    def execute(self) -> CertificateForm:
        return CertificateForm(
            CERTIFICATE_TYPES,
            tuple(LevelChoice(lv.code, lv.label, lv.examples, needs_domain(lv.code), lv.on_scale) for lv in LEVELS),
            DOMAINS,
            self._limits.max_bytes // (1024 * 1024),
            self._limits.max_certificates,
        )


@dataclass(frozen=True)
class Unlocks:
    """US-302 CA-02 : ce que le certificat débloque une fois validé (D-10)."""

    level: str | None
    searchable: str = SEARCHABLE


@dataclass(frozen=True)
class CertificateView:
    id: str
    certificate_type: str
    type_label: str
    level: str
    level_label: str
    title: str
    institution: str
    year: int
    country: str | None
    domain: str | None
    domain_label: str | None
    status: str
    status_label: str
    submitted_at: datetime
    unlocks: Unlocks


def certificate_view(certificate: Certificate) -> CertificateView:
    domain_label = None
    if certificate.domain:
        domain_label = certificate.domain_other if certificate.domain == "AUTRE" else DOMAIN_LABELS[certificate.domain]
    return CertificateView(
        certificate.id,
        certificate.certificate_type,
        TYPE_LABELS[certificate.certificate_type],
        certificate.level,
        LEVEL_LABELS[certificate.level],
        certificate.title,
        certificate.institution,
        certificate.year,
        certificate.country,
        certificate.domain,
        domain_label,
        certificate.status.value,
        STATUS_LABELS[certificate.status],
        certificate.submitted_at,
        Unlocks(unlocked_level(certificate.level)),
    )


@dataclass(frozen=True)
class MyCertificates:
    certificates: tuple[CertificateView, ...]
    limit: int
    validated_level: str | None
    """US-207 : « Niveau d'études validé » en tête de « Mes certificats » ; None tant qu'aucun n'est validé."""


class ListMyCertificates:
    """US-303 CA-01 : chaque certificat avec son statut."""

    def __init__(self, certificates: CertificateRepository, limits: Limits) -> None:
        self._certificates = certificates
        self._limits = limits

    def execute(self, employee_id: str) -> MyCertificates:
        certificates = self._certificates.list_for_employee(employee_id)
        views = tuple(certificate_view(c) for c in certificates)
        return MyCertificates(views, self._limits.max_certificates, validated_level(certificates))


class _DepositRules:
    def __init__(self, certificates: CertificateRepository, profile: ProfileStatus, limits: Limits) -> None:
        self._certificates = certificates
        self._profile = profile
        self._limits = limits

    def _check_open(self, employee_id: str) -> None:
        """US-204 : profil complet ; RG-22 : 20 certificats au plus."""
        if not self._profile.execute(employee_id):
            raise ProfileIncomplete()
        if self._certificates.count_for_employee(employee_id) >= self._limits.max_certificates:
            raise TooManyCertificates()


@dataclass(frozen=True)
class UploadRequest:
    upload_id: str
    ticket: UploadTicket


class RequestUpload(_DepositRules):
    """CA-06 : avant l'envoi, l'API contrôle le dépôt annoncé et signe un envoi direct au stockage privé."""

    def __init__(
        self, certificates: CertificateRepository, profile: ProfileStatus, storage: CertificateStorage, limits: Limits
    ) -> None:
        super().__init__(certificates, profile, limits)
        self._storage = storage

    def execute(self, employee_id: str, content_type: str, size_bytes: int) -> UploadRequest:
        self._check_open(employee_id)
        check_announced_type(content_type)
        if size_bytes > self._limits.max_bytes:
            raise CertificateFileTooLarge()
        upload_id = secrets.token_hex(16)
        return UploadRequest(upload_id, self._storage.presign_upload(storage_key(employee_id, upload_id), content_type))


class ReceiveLocalUpload:
    """Poste du développeur seulement : le stockage local reçoit le dépôt signé par l'API (en ligne, S3 le reçoit)."""

    def __init__(self, storage: CertificateStorage, limits: Limits) -> None:
        self._storage = storage
        self._limits = limits

    def execute(self, employee_id: str, upload_id: str, content: bytes) -> None:
        if not self._storage.receives_uploads:
            raise LocalUploadsUnavailable()
        if len(content) > self._limits.max_bytes:
            raise CertificateFileTooLarge()
        self._storage.receive(storage_key(employee_id, upload_id), content)


class DepositCertificate(_DepositRules):
    """CA-01 → CA-05 : le fichier reçu est contrôlé sur son contenu réel, puis le certificat est enregistré « Reçu ».
    Un champ manquant laisse le fichier en place : l'employé corrige et renvoie sans tout recommencer."""

    def __init__(
        self,
        certificates: CertificateRepository,
        profile: ProfileStatus,
        storage: CertificateStorage,
        clock: Clock,
        limits: Limits,
    ) -> None:
        super().__init__(certificates, profile, limits)
        self._storage = storage
        self._clock = clock

    def execute(self, employee_id: str, fields: CertificateFields, upload_id: str, original_name: str) -> CertificateView:
        self._check_open(employee_id)
        key = storage_key(employee_id, upload_id)
        cleaned = clean_fields(fields, self._clock.now().date())
        size = self._storage.size(key)
        if size is None:
            raise UploadNotFound()
        if size > self._limits.max_bytes:
            self._storage.delete(key)
            raise CertificateFileTooLarge()
        try:
            content_type = detect_kind(self._storage.head(key, SIGNATURE_LENGTH))
        except Exception:
            self._storage.delete(key)
            raise
        certificate = Certificate(
            str(uuid.uuid4()),
            employee_id,
            cleaned.certificate_type,
            cleaned.level,
            cleaned.title,
            cleaned.institution,
            cleaned.year,
            cleaned.country,
            cleaned.domain,
            cleaned.domain_other,
            CertificateStatus.RECEIVED,
            self._clock.now(),
        )
        self._certificates.add(
            certificate, CertificateFile(certificate.id, key, clean_original_name(original_name), content_type, size)
        )
        return certificate_view(certificate)


class GiveFeedback:
    """US-302 CA-03 : l'avis en un clic après le dépôt ; il peut être ignoré."""

    def __init__(self, certificates: CertificateRepository, clock: Clock) -> None:
        self._certificates = certificates
        self._clock = clock

    def execute(self, employee_id: str, certificate_id: str, rating: int) -> None:
        certificate = self._certificates.get(certificate_id)
        if certificate is None or certificate.employee_id != employee_id:
            raise CertificateNotFound()
        if rating not in RATINGS:
            raise InvalidRating()
        self._certificates.set_feedback(Feedback(employee_id, certificate_id, rating, self._clock.now()))


class CountFeedback:
    """US-605 CA-02 : réponses à la question en un clic, comptées par note ; jamais de commentaire."""

    def __init__(self, certificates: CertificateRepository) -> None:
        self._certificates = certificates

    def execute(self) -> dict[int, int]:
        counts = {rating: 0 for rating in RATINGS}
        for feedback in self._certificates.feedbacks():
            counts[feedback.rating] += 1
        return counts
