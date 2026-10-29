"""US-802 : saisir, modifier, publier, clôturer et pourvoir un poste ouvert.

Les rôles sont vérifiés par la couche api : saisie et modification par l'Agent RH ou l'Administrateur,
changements de statut par l'Administrateur seul (choix de l'utilisateur du 2026-10-11). Chaque étape est
inscrite au journal d'audit (US-604).
"""

import re
import secrets
from dataclasses import dataclass, field, replace
from datetime import date, datetime
from typing import Protocol

from app.admin.domain.audit import AuditAction, AuditEntry, AuditRepository
from app.certificate.application.use_cases import Limits, storage_key
from app.certificate.domain.certificate import DOMAIN_LABELS, DOMAINS, CertificateStatus, validated_level
from app.certificate.domain.errors import CertificateFileTooLarge, LocalUploadsUnavailable, UploadNotFound
from app.certificate.domain.files import SIGNATURE_LENGTH, check_announced_type, clean_original_name, detect_kind
from app.certificate.domain.ports import CertificateRepository, CertificateStorage, UploadTicket
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.job.domain.application import ApplicationStep, CvFile, JobApplication, Outcome
from app.job.domain.catalogue import JobProfileCatalogue, ProfileSection
from app.job.domain.eligibility import Audience, Candidate, ValidatedCertificate, audience, full_years, missing
from app.job.domain.errors import (
    AlreadyApplied,
    ApplicationNotFound,
    HrLetterNotFound,
    NotEligible,
    InvalidOpeningField,
    OpeningCodeTaken,
    OpeningNotFound,
    OpeningNotOpen,
    ProfileIncomplete,
    StepRefused,
)
from app.job.domain.opening import (
    Actor,
    Criteria,
    HrLetter,
    JobOpening,
    OpeningFields,
    OpeningStatus,
    StatusChange,
    check_criteria,
    validate_fields,
)
from app.job.domain.ports import ApplicationRepository, OpeningRepository
from app.referential.domain.ports import ReferentialRepository
from app.shared.domain.clock import Clock
from app.shared.domain.levels import LEVELS, LEVELS_BY_CODE


@dataclass(frozen=True)
class Option:
    code: str
    label: str


@dataclass(frozen=True)
class UnitOption:
    code: str
    label: str
    type_label: str


@dataclass(frozen=True)
class OpeningForm:
    units: list[UnitOption]
    levels: list[Option]
    domains: list[Option]


@dataclass(frozen=True)
class StepView:
    status: str
    status_label: str
    at: datetime
    actor_name: str


@dataclass(frozen=True)
class CriteriaChangeView:
    at: datetime
    actor_name: str
    before: list[str]
    after: list[str]


@dataclass(frozen=True)
class LetterView:
    """US-124 : la lettre du directeur RH jointe à la publication (le fichier s'ouvre à part, consultation tracée)."""

    name: str
    content_type: str
    size_bytes: int
    at: datetime
    actor_name: str


@dataclass(frozen=True)
class OpeningView:
    id: int
    code: str
    title: str
    unit_code: str
    unit_label: str
    target_grade: str
    mission: str
    opens_on: date
    closes_on: date
    criteria: Criteria
    criteria_lines: list[str]
    status: str
    status_label: str
    history: list[StepView]
    criteria_changes: list[CriteriaChangeView]
    profile_code: str | None = None
    profile_title: str | None = None
    letter: LetterView | None = None
    application_count: int = 0
    """US-135 : candidatures reçues (liste des postes seulement)."""
    created_by_me: bool = False
    """US-135 : « saisi par vous » (liste des postes seulement)."""


def _unit_labels(referential: ReferentialRepository) -> dict[str, str]:
    return {code: unit.label for code, unit in referential.units().items()}


def _step(change: StatusChange) -> StepView:
    return StepView(change.status.value, change.status.label, change.at, change.actor.name)


def _view(opening: JobOpening, units: dict[str, str], catalogue: JobProfileCatalogue) -> OpeningView:
    profile = catalogue.get(opening.profile_code) if opening.profile_code else None
    return OpeningView(
        id=opening.id,
        code=opening.code,
        title=opening.title,
        unit_code=opening.unit_code,
        unit_label=units.get(opening.unit_code, opening.unit_code),
        target_grade=opening.target_grade,
        mission=opening.mission,
        opens_on=opening.opens_on,
        closes_on=opening.closes_on,
        criteria=opening.criteria,
        criteria_lines=opening.criteria.describe(units),
        status=opening.status.value,
        status_label=opening.status.label,
        history=[_step(change) for change in opening.history],
        criteria_changes=[
            CriteriaChangeView(change.at, change.actor.name, list(change.before), list(change.after))
            for change in opening.criteria_changes
        ],
        profile_code=opening.profile_code,
        profile_title=profile.title if profile else None,
        letter=_letter_view(opening.letter),
    )


def _letter_view(letter: HrLetter | None) -> LetterView | None:
    if letter is None:
        return None
    return LetterView(letter.name, letter.content_type, letter.size_bytes, letter.at, letter.actor.name)


class _OpeningCase:
    def __init__(
        self,
        openings: OpeningRepository,
        referential: ReferentialRepository,
        audit: AuditRepository,
        clock: Clock,
        catalogue: JobProfileCatalogue,
    ) -> None:
        self._openings = openings
        self._referential = referential
        self._audit = audit
        self._clock = clock
        self._catalogue = catalogue

    def _view(self, opening: JobOpening, units: dict[str, str]) -> OpeningView:
        return _view(opening, units, self._catalogue)

    def _check_profile(self, fields: OpeningFields) -> None:
        """US-119 : un poste issu du catalogue cite une fiche qui existe."""
        if fields.profile_code and self._catalogue.get(fields.profile_code) is None:
            raise InvalidOpeningField("Choisissez une fiche du catalogue des postes.", field="profile_code")

    def _get(self, opening_id: int) -> JobOpening:
        opening = self._openings.get(opening_id)
        if opening is None:
            raise OpeningNotFound()
        return opening

    def _trace(self, actor: Actor, opening: JobOpening, details: str, at: datetime) -> None:
        self._audit.add(
            AuditEntry(
                id=None,
                at=at,
                actor_id=actor.id,
                actor_name=actor.name,
                action=AuditAction.JOB_OPENING.value,
                target_id=opening.code,
                target_name=opening.title,
                details=details,
            )
        )

    def _trace_status(self, actor: Actor, opening: JobOpening, at: datetime) -> None:
        self._trace(actor, opening, f"Poste {opening.code} : {opening.status.label}", at)


class GetOpeningForm:
    """Listes de la fiche : unités du référentiel (US-501), niveaux de l'échelle, domaines des certificats."""

    def __init__(self, referential: ReferentialRepository) -> None:
        self._referential = referential

    def execute(self) -> OpeningForm:
        units = sorted(self._referential.units().values(), key=lambda unit: (unit.type.label, unit.label))
        return OpeningForm(
            units=[UnitOption(unit.code, unit.label, unit.type.label) for unit in units if unit.end is None],
            levels=[Option(level.code, level.label) for level in LEVELS if level.on_scale],
            domains=[Option(domain.code, domain.label) for domain in DOMAINS if domain.code != "AUTRE"],
        )


class ListOpenings(_OpeningCase):
    """US-135 : chaque poste avec ses candidatures reçues et « saisi par vous » pour le compte qui regarde."""

    def __init__(self, *ports, applications: ApplicationRepository | None = None) -> None:
        super().__init__(*ports)
        self._applications = applications

    def execute(self, viewer_id: str | None = None) -> list[OpeningView]:
        units = _unit_labels(self._referential)
        views = []
        for opening in self._openings.list_all():
            count = len(self._applications.for_opening(opening.id)) if self._applications else 0
            created_by_me = bool(viewer_id and opening.history and opening.history[0].actor.id == viewer_id)
            views.append(replace(self._view(opening, units), application_count=count, created_by_me=created_by_me))
        return views


class GetOpening(_OpeningCase):
    def execute(self, opening_id: int) -> OpeningView:
        return self._view(self._get(opening_id), _unit_labels(self._referential))


class CreateOpening(_OpeningCase):
    """CA-01 : l'Agent RH saisit la fiche ; le poste reste un brouillon jusqu'à sa publication."""

    def execute(self, fields: OpeningFields, actor: Actor) -> OpeningView:
        units = _unit_labels(self._referential)
        fields = validate_fields(fields, units)
        self._check_profile(fields)
        if self._openings.code_taken(fields.code):
            raise OpeningCodeTaken()
        now = self._clock.now()
        opening = self._openings.add(JobOpening.create(fields, actor, now))
        self._trace_status(actor, opening, now)
        return self._view(opening, units)


class UpdateOpening(_OpeningCase):
    """CA-02 : un critère modifié après publication est tracé ; un poste clôturé ou pourvu ne change plus."""

    def execute(self, opening_id: int, fields: OpeningFields, actor: Actor) -> OpeningView:
        opening = self._get(opening_id)
        units = _unit_labels(self._referential)
        fields = validate_fields(fields, units)
        self._check_profile(fields)
        if self._openings.code_taken(fields.code, except_id=opening_id):
            raise OpeningCodeTaken()
        now = self._clock.now()
        traced = len(opening.criteria_changes)
        opening.update(fields, actor, now, units)
        self._openings.save(opening)
        if len(opening.criteria_changes) > traced:
            self._trace(actor, opening, f"Critères du poste {opening.code} modifiés après publication", now)
        return self._view(opening, units)


class ChangeOpeningStatus(_OpeningCase):
    """CA-02 : clôturer, pourvoir (Administrateur seul) ; chaque étape est datée et signée. Publier : PublishOpening."""

    ACTIONS = ("close", "fill")

    def execute(self, opening_id: int, action: str, actor: Actor) -> OpeningView:
        if action not in self.ACTIONS:
            raise OpeningNotFound()
        opening = self._get(opening_id)
        now = self._clock.now()
        getattr(opening, action)(actor, now)
        self._openings.save(opening)
        self._trace_status(actor, opening, now)
        return self._view(opening, _unit_labels(self._referential))


# --- US-124 : publier avec la lettre du directeur RH ---------------------------------------

_UPLOAD_ID = re.compile(r"^[0-9a-f]{32}$")


def letter_key(upload_id: str) -> str:
    """Nom aléatoire dans le dossier des lettres du stockage privé (comme un certificat, US-301 CA-05)."""
    if not _UPLOAD_ID.match(upload_id or ""):
        raise UploadNotFound()
    return f"job-letters/{upload_id}"


@dataclass(frozen=True)
class LetterUpload:
    upload_id: str
    ticket: UploadTicket


class RequestLetterUpload:
    """Avant l'envoi de la lettre : type annoncé et taille contrôlés, dépôt signé vers le stockage privé."""

    def __init__(self, storage: CertificateStorage, limits: Limits) -> None:
        self._storage = storage
        self._limits = limits

    def execute(self, content_type: str, size_bytes: int) -> LetterUpload:
        check_announced_type(content_type)
        if size_bytes > self._limits.max_bytes:
            raise CertificateFileTooLarge()
        upload_id = secrets.token_hex(16)
        return LetterUpload(upload_id, self._storage.presign_upload(letter_key(upload_id), content_type))


class ReceiveLetterUpload:
    """Poste du développeur seulement : le stockage local reçoit la lettre par l'API (en ligne, S3 la reçoit)."""

    def __init__(self, storage: CertificateStorage, limits: Limits) -> None:
        self._storage = storage
        self._limits = limits

    def execute(self, upload_id: str, content: bytes) -> None:
        if not self._storage.receives_uploads:
            raise LocalUploadsUnavailable()
        if len(content) > self._limits.max_bytes:
            raise CertificateFileTooLarge()
        self._storage.receive(letter_key(upload_id), content)


class PublishOpening(_OpeningCase):
    """CA-01, CA-02 : l'Agent RH publie avec la lettre du directeur RH, contrôlée sur son contenu réel ;
    l'Administrateur publie avec ou sans lettre."""

    def __init__(self, *ports, storage: CertificateStorage, limits: Limits) -> None:
        super().__init__(*ports)
        self._storage = storage
        self._limits = limits

    def _letter(self, upload_id: str | None, name: str, actor: Actor, at: datetime) -> HrLetter | None:
        if not upload_id:
            return None
        key = letter_key(upload_id)
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
        return HrLetter(key, clean_original_name(name or "lettre"), content_type, size, at, actor)

    def execute(
        self, opening_id: int, actor: Actor, *, letter_required: bool, letter_upload_id: str | None = None,
        letter_name: str = "",
    ) -> OpeningView:
        opening = self._get(opening_id)
        now = self._clock.now()
        letter = self._letter(letter_upload_id, letter_name, actor, now) if opening.status is OpeningStatus.DRAFT else None
        opening.publish(actor, now, letter, letter_required=letter_required)
        self._openings.save(opening)
        self._trace_status(actor, opening, now)
        return self._view(opening, _unit_labels(self._referential))


@dataclass(frozen=True)
class LetterContent:
    name: str
    content_type: str
    content: bytes


class GetOpeningLetter(_OpeningCase):
    """CA-03 : ouvrir la lettre jointe ; chaque consultation est inscrite au journal d'audit (US-604)."""

    def __init__(self, *ports, storage: CertificateStorage) -> None:
        super().__init__(*ports)
        self._storage = storage

    def execute(self, opening_id: int, actor: Actor) -> LetterContent:
        opening = self._get(opening_id)
        letter = opening.letter
        if letter is None:
            raise HrLetterNotFound()
        self._trace(actor, opening, f"Consultation de la lettre du directeur RH du poste {opening.code}", self._clock.now())
        return LetterContent(letter.name, letter.content_type, self._storage.read(letter.key))


# --- US-801 : les postes publiés auxquels l'employé est apte ------------------------------


class UnitCodes(Protocol):
    def execute(self, agency_value: str, department_value: str) -> tuple[str, ...]: ...

    def execute_many(self, pairs) -> dict[tuple[str, str], tuple[str, ...]]: ...


@dataclass(frozen=True)
class MyOpeningView:
    id: int
    code: str
    title: str
    unit_label: str
    target_grade: str
    mission: str
    opens_on: date
    closes_on: date
    criteria_lines: list[str]
    profile_department: str | None = None
    competences: tuple[str, ...] = ()
    """US-121 : le département et les compétences du poste du catalogue."""
    sections: tuple[ProfileSection, ...] = ()
    """US-119 : la fiche complète du catalogue, rubrique par rubrique (vide pour un poste hors catalogue)."""


class EmployeeEligibility:
    """US-801 : ce qui compte pour l'éligibilité d'un employé, sur ses seules données validées (EF-805, CA-03)."""

    def __init__(
        self, employees: EmployeeRepository, certificates: CertificateRepository, unit_codes: UnitCodes, clock: Clock
    ) -> None:
        self._employees = employees
        self._certificates = certificates
        self._unit_codes = unit_codes
        self._clock = clock

    def candidate(self, employee_id: str) -> Candidate:
        employee = get_employee(self._employees, employee_id)
        return self._candidate(
            employee,
            self._certificates.list_for_employee(employee_id),
            self._unit_codes.execute(employee.agency_code, employee.department),
        )

    def all_candidates(self) -> list[Candidate]:
        """US-115 : tous les employés en activité, en trois lectures (employés, certificats, référentiel)."""
        employees = self._employees.list_all()
        certificates: dict[str, list] = {}
        for certificate in self._certificates.list_all():
            certificates.setdefault(certificate.employee_id, []).append(certificate)
        units = self._unit_codes.execute_many({(e.agency_code, e.department) for e in employees})
        return [
            self._candidate(e, certificates.get(e.id, []), units[(e.agency_code, e.department)]) for e in employees
        ]

    @staticmethod
    def _candidate(employee, certificates, unit_codes) -> Candidate:
        return Candidate(
            certificates=tuple(
                ValidatedCertificate(c.level, c.domain)
                for c in certificates
                if c.status == CertificateStatus.VALIDATED and not c.is_archived
            ),
            hire_date=employee.hire_date,
            grade=employee.grade or "",
            unit_codes=frozenset(unit_codes),
        )

    def snapshot(self, employee_id: str, unit_labels: dict[str, str]) -> tuple[str, ...]:
        """US-902 : profil au moment de la candidature (Q6 §4), en phrases ; il ne change plus ensuite."""
        employee = get_employee(self._employees, employee_id)
        validated = [
            c for c in self._certificates.list_for_employee(employee_id)
            if c.status == CertificateStatus.VALIDATED and not c.is_archived
        ]
        units = [unit_labels.get(code, code) for code in self._unit_codes.execute(employee.agency_code, employee.department)]
        if employee.hire_date:
            years = full_years(employee.hire_date, self._clock.now().date())
            seniority = f"{years} an{'s' if years > 1 else ''} (embauche le {employee.hire_date.strftime('%d/%m/%Y')})"
        else:
            seniority = "inconnue"
        certificates = [
            f"{c.title} ({', '.join(filter(None, [LEVELS_BY_CODE[c.level].label, DOMAIN_LABELS.get(c.domain or ''), str(c.year)]))})"
            for c in validated
        ]
        return (
            f"Poste : {employee.position or 'inconnu'}",
            f"Grade : {employee.grade or 'inconnu'}",
            f"Unités : {', '.join(units) if units else 'à rattacher'}",
            f"Ancienneté dans l'institution : {seniority}",
            f"Niveau d'études validé : {validated_level(validated) or 'aucun'}",
            f"Certificats validés : {' ; '.join(certificates) if certificates else 'aucun'}",
        )

    @staticmethod
    def is_open(opening: JobOpening, today: date) -> bool:
        """Publié, date d'ouverture atteinte, date limite non passée."""
        return opening.status is OpeningStatus.PUBLISHED and opening.opens_on <= today <= opening.closes_on


class ListMyOpenings:
    """Choix du 2026-10-11 : un poste publié et ouvert n'apparaît qu'aux employés qui remplissent tous ses critères,
    sur leurs seules données validées (EF-805, CA-03)."""

    def __init__(
        self,
        openings: OpeningRepository,
        eligibility: EmployeeEligibility,
        referential: ReferentialRepository,
        clock: Clock,
        catalogue: JobProfileCatalogue,
    ) -> None:
        self._openings = openings
        self._eligibility = eligibility
        self._referential = referential
        self._clock = clock
        self._catalogue = catalogue

    def _my_view(self, o: JobOpening, units: dict[str, str]) -> MyOpeningView:
        profile = self._catalogue.get(o.profile_code) if o.profile_code else None
        return MyOpeningView(
            o.id, o.code, o.title, units.get(o.unit_code, o.unit_code), o.target_grade, o.mission, o.opens_on,
            o.closes_on, o.criteria.describe(units),
            profile_department=profile.department if profile else None,
            competences=profile.competences if profile else (),
            sections=profile.sections if profile else (),
        )

    def execute(self, employee_id: str) -> list[MyOpeningView]:
        candidate = self._eligibility.candidate(employee_id)
        today = self._clock.now().date()
        units = _unit_labels(self._referential)
        return [
            self._my_view(o, units)
            for o in self._openings.list_all()
            if self._eligibility.is_open(o, today) and not missing(o.criteria, candidate, today)
        ]


class PreviewAudience:
    """US-115 CA-04 : pendant la saisie, combien d'employés verront le poste et ce que chaque critère écarte."""

    def __init__(self, eligibility: EmployeeEligibility, referential: ReferentialRepository, clock: Clock) -> None:
        self._eligibility = eligibility
        self._referential = referential
        self._clock = clock

    def execute(self, criteria: Criteria) -> Audience:
        units = _unit_labels(self._referential)
        criteria = check_criteria(criteria, units)
        return audience(criteria, self._eligibility.all_candidates(), self._clock.now().date(), units)


# --- US-902 : déposer et suivre sa candidature à un poste ---------------------------------


class ProfileComplete(Protocol):
    def execute(self, employee_id: str) -> bool: ...


@dataclass(frozen=True)
class ApplicationStepView:
    step: str
    step_label: str
    outcome_label: str | None
    at: datetime
    actor_name: str


@dataclass(frozen=True)
class ApplicationView:
    id: int
    reference: str
    opening_id: int
    opening_code: str
    opening_title: str
    motivation: str
    received_at: datetime
    step: str
    step_label: str
    step_number: int
    outcome: str | None
    outcome_label: str | None
    can_withdraw: bool
    history: list[ApplicationStepView]
    cv: CvFile | None = None
    employee_code: str = ""
    employee_name: str = ""
    next_steps: list[Option] = field(default_factory=list)
    profile_snapshot: tuple[str, ...] = ()


def _employee_name(employee) -> str:
    return f"{employee.first_name} {employee.last_name}"


def _application_view(application: JobApplication, opening: JobOpening, employee=None) -> ApplicationView:
    return ApplicationView(
        id=application.id,
        reference=application.reference,
        opening_id=opening.id,
        opening_code=opening.code,
        opening_title=opening.title,
        motivation=application.motivation,
        received_at=application.received_at,
        step=application.step.value,
        step_label=application.step.label,
        step_number=application.step.number,
        outcome=application.outcome.value if application.outcome else None,
        outcome_label=application.outcome.label if application.outcome else None,
        can_withdraw=not application.closed,
        history=[
            ApplicationStepView(
                change.step.value, change.step.label, change.outcome.label if change.outcome else None, change.at,
                change.actor.name,
            )
            for change in application.history
        ],
        cv=application.cv,
        employee_code=employee.employee_code if employee else "",
        employee_name=_employee_name(employee) if employee else "",
        next_steps=[Option(step.value, step.label) for step in application.next_steps()],
        profile_snapshot=application.profile_snapshot if employee else (),
    )


class _ApplicationCase:
    def __init__(
        self,
        applications: ApplicationRepository,
        openings: OpeningRepository,
        employees: EmployeeRepository,
        audit: AuditRepository,
        clock: Clock,
    ) -> None:
        self._applications = applications
        self._openings = openings
        self._employees = employees
        self._audit = audit
        self._clock = clock

    def _opening(self, opening_id: int) -> JobOpening:
        opening = self._openings.get(opening_id)
        if opening is None:
            raise OpeningNotFound()
        return opening

    def _application(self, application_id: int) -> JobApplication:
        application = self._applications.get(application_id)
        if application is None:
            raise ApplicationNotFound()
        return application

    def _employee_actor(self, employee_id: str) -> Actor:
        return Actor(employee_id, _employee_name(get_employee(self._employees, employee_id)))


@dataclass(frozen=True)
class CvUpload:
    upload_id: str
    ticket: UploadTicket


class RequestCvUpload:
    """Avant l'envoi du CV : type annoncé et taille contrôlés, dépôt signé vers le stockage privé (comme US-301)."""

    def __init__(self, storage: CertificateStorage, limits: Limits, profile_complete: ProfileComplete) -> None:
        self._storage = storage
        self._limits = limits
        self._profile_complete = profile_complete

    def execute(self, employee_id: str, content_type: str, size_bytes: int) -> CvUpload:
        if not self._profile_complete.execute(employee_id):
            raise ProfileIncomplete()
        check_announced_type(content_type)
        if size_bytes > self._limits.max_bytes:
            raise CertificateFileTooLarge()
        upload_id = secrets.token_hex(16)
        return CvUpload(upload_id, self._storage.presign_upload(storage_key(employee_id, upload_id), content_type))


class ApplyToOpening(_ApplicationCase):
    """L'employé apte postule ; l'accusé de réception est immédiat (RG-73). Profil complet exigé (D-23).
    Le CV facultatif est contrôlé sur son contenu réel ; le profil du moment est figé avec la candidature."""

    def __init__(
        self,
        *ports,
        eligibility: EmployeeEligibility,
        profile_complete: ProfileComplete,
        storage: CertificateStorage,
        limits: Limits,
        referential: ReferentialRepository,
    ) -> None:
        super().__init__(*ports)
        self._eligibility = eligibility
        self._profile_complete = profile_complete
        self._storage = storage
        self._limits = limits
        self._referential = referential

    def _cv(self, employee_id: str, upload_id: str | None, name: str) -> CvFile | None:
        if not upload_id:
            return None
        key = storage_key(employee_id, upload_id)
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
        return CvFile(key, clean_original_name(name or "cv"), content_type, size)

    def execute(
        self, employee_id: str, opening_id: int, motivation: str, cv_upload_id: str | None = None, cv_name: str = ""
    ) -> ApplicationView:
        opening = self._opening(opening_id)
        now = self._clock.now()
        if not self._eligibility.is_open(opening, now.date()):
            raise OpeningNotOpen()
        if missing(opening.criteria, self._eligibility.candidate(employee_id), now.date()):
            raise NotEligible()
        if not self._profile_complete.execute(employee_id):
            raise ProfileIncomplete()
        if any(a.opening_id == opening_id and not a.closed for a in self._applications.for_employee(employee_id)):
            raise AlreadyApplied()
        cv = self._cv(employee_id, cv_upload_id, cv_name)
        snapshot = self._eligibility.snapshot(employee_id, _unit_labels(self._referential))
        application = JobApplication.submit(
            opening_id, employee_id, motivation, self._employee_actor(employee_id), now, cv=cv, profile_snapshot=snapshot
        )
        return _application_view(self._applications.add(application), opening)


class ListMyApplications(_ApplicationCase):
    """CA-02 : « Mes candidatures » montre l'étape en cours de chacune."""

    def execute(self, employee_id: str) -> list[ApplicationView]:
        return [
            _application_view(application, self._opening(application.opening_id))
            for application in self._applications.for_employee(employee_id)
        ]


class WithdrawApplication(_ApplicationCase):
    """L'employé retire sa candidature tant qu'elle n'est pas clôturée ; elle reste dans l'historique (RG-74)."""

    def execute(self, employee_id: str, application_id: int) -> ApplicationView:
        application = self._application(application_id)
        if application.employee_id != employee_id:
            raise ApplicationNotFound()
        application.withdraw(self._employee_actor(employee_id), self._clock.now())
        self._applications.save(application)
        return _application_view(application, self._opening(application.opening_id))


class ListOpeningApplications(_ApplicationCase):
    """Les candidatures à un poste, sur sa fiche (espace RH), dans l'ordre d'arrivée."""

    def execute(self, opening_id: int) -> list[ApplicationView]:
        opening = self._opening(opening_id)
        return [
            _application_view(application, opening, get_employee(self._employees, application.employee_id))
            for application in self._applications.for_opening(opening_id)
        ]


class _RhApplicationCase(_ApplicationCase):
    def _done(self, application: JobApplication, actor: Actor, now: datetime) -> ApplicationView:
        self._applications.save(application)
        opening = self._opening(application.opening_id)
        employee = get_employee(self._employees, application.employee_id)
        state = application.step.label
        if application.outcome:
            state = f"{state} ({application.outcome.label})"
        self._audit.add(
            AuditEntry(
                id=None,
                at=now,
                actor_id=actor.id,
                actor_name=actor.name,
                action=AuditAction.JOB_APPLICATION.value,
                target_id=employee.employee_code,
                target_name=_employee_name(employee),
                details=f"Candidature {application.reference} au poste {opening.code} : {state}",
            )
        )
        return _application_view(application, opening, employee)


class MoveApplication(_RhApplicationCase):
    """Les RH font avancer une candidature vers une étape suivante (l'évaluation peut être sautée)."""

    def execute(self, application_id: int, step: str, actor: Actor) -> ApplicationView:
        application = self._application(application_id)
        try:
            target = ApplicationStep(step)
        except ValueError:
            raise StepRefused("Choisissez une étape du circuit.") from None
        now = self._clock.now()
        application.move_to(target, actor, now)
        return self._done(application, actor, now)


class CloseApplication(_RhApplicationCase):
    """Les RH clôturent avec une suite : acceptée, refusée ou reportée."""

    def execute(self, application_id: int, outcome: str, actor: Actor) -> ApplicationView:
        application = self._application(application_id)
        try:
            chosen = Outcome(outcome)
        except ValueError:
            raise StepRefused("Clôturez avec une suite : acceptée, refusée ou reportée.") from None
        now = self._clock.now()
        application.close(chosen, actor, now)
        return self._done(application, actor, now)


@dataclass(frozen=True)
class CvContent:
    name: str
    content_type: str
    content: bytes


class GetApplicationCv(_ApplicationCase):
    """Espace RH : ouvrir le CV d'une candidature ; chaque consultation est inscrite au journal d'audit (US-604)."""

    def __init__(self, *ports, storage: CertificateStorage) -> None:
        super().__init__(*ports)
        self._storage = storage

    def execute(self, application_id: int, actor: Actor) -> CvContent:
        application = self._application(application_id)
        if application.cv is None:
            raise ApplicationNotFound("Aucun CV joint à cette candidature.")
        employee = get_employee(self._employees, application.employee_id)
        self._audit.add(
            AuditEntry(
                id=None,
                at=self._clock.now(),
                actor_id=actor.id,
                actor_name=actor.name,
                action=AuditAction.DOCUMENT_VIEW.value,
                target_id=employee.employee_code,
                target_name=_employee_name(employee),
                details=f"Consultation du CV de la candidature {application.reference}",
            )
        )
        cv = application.cv
        return CvContent(cv.name, cv.content_type, self._storage.read(cv.key))
