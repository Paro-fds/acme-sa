"""US-301 : déposer un certificat (EF-301, EF-302, EF-308) ; US-303 : le suivre (EF-303)."""

import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import date, datetime

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
    CertificateHistoryEntry,
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
    CannotDeleteValidatedCertificate,
    CertificateFileMissing,
    CertificateFileTooLarge,
    CertificateNotFound,
    InvalidRating,
    LocalUploadsUnavailable,
    ProfileIncomplete,
    TooManyCertificates,
    UploadNotFound,
)
from app.certificate.domain.review import review_deadline
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
    replaces_id: str | None = None
    is_archived: bool = False
    decided_at: datetime | None = None
    rejection_reason: str | None = None
    rejection_comment: str | None = None
    answer_by: date | None = None
    """US-130 CA-08 : décision, motif et commentaire des RH (à corriger), date limite de réponse (en examen) ; jamais l'agent."""


_IN_REVIEW = (CertificateStatus.RECEIVED, CertificateStatus.IN_REVIEW)


def certificate_view(certificate: Certificate) -> CertificateView:
    domain_label = None
    to_correct = certificate.status is CertificateStatus.TO_CORRECT
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
        replaces_id=certificate.replaces_id,
        is_archived=certificate.is_archived,
        decided_at=certificate.decided_at,
        rejection_reason=certificate.rejection_reason if to_correct else None,
        rejection_comment=certificate.rejection_comment if to_correct else None,
        answer_by=review_deadline(certificate.submitted_at.date()) if certificate.status in _IN_REVIEW else None,
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
    Un champ manquant laisse le fichier en place : l'employé corrige et renvoie sans tout recommencer.
    US-304 CA-02 : si replaces_id est renseigné, l'ancien certificat validé reste archivé avec son historique."""

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

    def execute(
        self,
        employee_id: str,
        fields: CertificateFields,
        upload_id: str,
        original_name: str,
        replaces_id: str | None = None,
    ) -> CertificateView:
        self._check_open(employee_id)
        now = self._clock.now()

        # US-304 CA-02 : archivage de l'ancien certificat remplacé
        if replaces_id:
            old_cert = self._certificates.get(replaces_id)
            if not old_cert or old_cert.employee_id != employee_id:
                raise CertificateNotFound()
            archived_old = Certificate(
                id=old_cert.id,
                employee_id=old_cert.employee_id,
                certificate_type=old_cert.certificate_type,
                level=old_cert.level,
                title=old_cert.title,
                institution=old_cert.institution,
                year=old_cert.year,
                country=old_cert.country,
                domain=old_cert.domain,
                domain_other=old_cert.domain_other,
                status=old_cert.status,
                submitted_at=old_cert.submitted_at,
                assigned_to=old_cert.assigned_to,
                assigned_at=old_cert.assigned_at,
                decided_by=old_cert.decided_by,
                decided_at=old_cert.decided_at,
                rejection_reason=old_cert.rejection_reason,
                rejection_comment=old_cert.rejection_comment,
                original_level=old_cert.original_level,
                replaces_id=old_cert.replaces_id,
                is_archived=True,
            )
            self._certificates.update(archived_old)

        key = storage_key(employee_id, upload_id)
        cleaned = clean_fields(fields, now.date())
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
        new_cert_id = str(uuid.uuid4())
        certificate = Certificate(
            id=new_cert_id,
            employee_id=employee_id,
            certificate_type=cleaned.certificate_type,
            level=cleaned.level,
            title=cleaned.title,
            institution=cleaned.institution,
            year=cleaned.year,
            country=cleaned.country,
            domain=cleaned.domain,
            domain_other=cleaned.domain_other,
            status=CertificateStatus.RECEIVED,
            submitted_at=now,
            replaces_id=replaces_id,
            is_archived=False,
        )
        self._certificates.add(
            certificate, CertificateFile(certificate.id, key, clean_original_name(original_name), content_type, size)
        )
        if replaces_id:
            self._certificates.add_history(
                CertificateHistoryEntry(
                    id=None,
                    certificate_id=replaces_id,
                    actor_id=employee_id,
                    actor_name=None,
                    action="REPLACED",
                    details=f"Remplacé par le nouveau certificat {new_cert_id}",
                    at=now,
                )
            )
        return certificate_view(certificate)


class DeleteCertificate:
    """US-304 CA-01 : Un certificat validé constitue une preuve et ne peut jamais être supprimé."""

    def __init__(self, certificates: CertificateRepository, storage: CertificateStorage) -> None:
        self._certificates = certificates
        self._storage = storage

    def execute(self, employee_id: str, certificate_id: str) -> None:
        cert = self._certificates.get(certificate_id)
        if not cert or cert.employee_id != employee_id:
            raise CertificateNotFound()
        if cert.status == CertificateStatus.VALIDATED:
            raise CannotDeleteValidatedCertificate()

        files = self._certificates.files_of(certificate_id)
        for f in files:
            self._storage.delete(f.storage_key)
        self._certificates.delete(certificate_id)


@dataclass(frozen=True)
class CertificateFileContent:
    original_name: str
    content_type: str
    content: bytes


class GetMyCertificateFile:
    """US-118 : l'employé ouvre le fichier de l'un de ses certificats, archivé compris (CA-01 à CA-03)."""

    def __init__(self, certificates: CertificateRepository, storage: CertificateStorage) -> None:
        self._certificates = certificates
        self._storage = storage

    def execute(self, employee_id: str, certificate_id: str) -> CertificateFileContent:
        certificate = self._certificates.get(certificate_id)
        if certificate is None or certificate.employee_id != employee_id:
            raise CertificateNotFound()
        files = self._certificates.files_of(certificate_id)
        # CA-04 : un fichier absent du stockage se dit clairement, sans erreur serveur.
        if not files or self._storage.size(files[0].storage_key) is None:
            raise CertificateFileMissing()
        file = files[0]
        return CertificateFileContent(file.original_name, file.content_type, self._storage.read(file.storage_key))


@dataclass(frozen=True)
class AdminEmployeeCertificateView:
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
    decided_by: str | None
    decided_at: datetime | None
    original_level: str | None
    rejection_reason: str | None
    rejection_comment: str | None
    replaces_id: str | None
    is_archived: bool
    history: list[CertificateHistoryEntry]
    files: list[CertificateFile]


class GetEmployeeCertificatesForAdmin:
    """US-304 : Retrouver tout certificat validé, même remplacé, avec son historique de décisions complet."""

    def __init__(self, certificates: CertificateRepository) -> None:
        self._certificates = certificates

    def execute(self, employee_id: str) -> list[AdminEmployeeCertificateView]:
        all_certs = self._certificates.list_for_employee(employee_id)
        views = []
        for c in all_certs:
            domain_label = None
            if c.domain:
                domain_label = c.domain_other if c.domain == "AUTRE" else DOMAIN_LABELS.get(c.domain, c.domain)
            history = self._certificates.history_of(c.id)
            files = self._certificates.files_of(c.id)
            views.append(
                AdminEmployeeCertificateView(
                    id=c.id,
                    certificate_type=c.certificate_type,
                    type_label=TYPE_LABELS.get(c.certificate_type, c.certificate_type),
                    level=c.level,
                    level_label=LEVEL_LABELS.get(c.level, c.level),
                    title=c.title,
                    institution=c.institution,
                    year=c.year,
                    country=c.country,
                    domain=c.domain,
                    domain_label=domain_label,
                    status=c.status.value,
                    status_label=STATUS_LABELS.get(c.status, c.status.value),
                    submitted_at=c.submitted_at,
                    decided_by=c.decided_by,
                    decided_at=c.decided_at,
                    original_level=c.original_level,
                    rejection_reason=c.rejection_reason,
                    rejection_comment=c.rejection_comment,
                    replaces_id=c.replaces_id,
                    is_archived=c.is_archived,
                    history=history,
                    files=files,
                )
            )
        return views


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
