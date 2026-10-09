"""US-202 : consentement, coordonnées, contact d'urgence et niveau d'études (EF-202, EF-208, EF-209) ;
US-203 : confirmer ou signaler agence, poste, date d'embauche (EF-203, EF-204, EF-205)."""

from dataclasses import dataclass
from datetime import datetime

from app.dossier.domain.dossier import (
    Confirmation,
    ConfirmationDates,
    Consent,
    ConsentState,
    ConsentSubject,
    Dossier,
    EmergencyContact,
    Gesture,
    Information,
    gesture,
)
from app.dossier.domain.errors import ConsentRequired, InvalidDossierField, NoticeNotAccepted, UnknownHrInformation
from app.dossier.domain.hr_information import (
    LABELS,
    HrItem,
    HrValues,
    Report,
    ReportOrigin,
    clean_report,
    hired_too_young,
    hr_done,
    hr_item,
    hr_status,
)
from app.dossier.domain.ports import DossierRepository, ExportContact, HrInformationSource
from app.dossier.domain.rules import (
    EDUCATION_LEVELS,
    RELATIONSHIPS,
    Choice,
    EducationLevel,
    clean_address,
    clean_contact_name,
    clean_education_level,
    clean_email,
    clean_phone,
    clean_relationship,
    normalize_text,
)
from app.employee.domain.affectation import UnitDirectory
from app.employee.domain.completion import Completion, completion
from app.employee.domain.dossier import DossierSummary
from app.employee.domain.repository import EmployeeRepository, get_employee
from app.shared.domain.clock import Clock


@dataclass(frozen=True)
class FieldView:
    value: str | None
    """Valeur du dossier, sinon celle de l'export proposée à l'employé."""
    complete: bool
    confirmed_at: datetime | None


@dataclass(frozen=True)
class EmailView(FieldView):
    no_email: bool = False


@dataclass(frozen=True)
class ContactView:
    name: str | None
    relationship: str | None
    telephone: str | None
    complete: bool
    confirmed_at: datetime | None


@dataclass(frozen=True)
class HrItemView:
    key: str
    label: str
    value: str
    status: str
    """`TO_CONFIRM`, `CONFIRMED` ou `REPORTED` (la dernière réponse de l'employé)."""
    answered_at: datetime | None


@dataclass(frozen=True)
class DossierView:
    consent: ConsentState
    telephone: FieldView
    address: FieldView
    email: EmailView
    emergency_contact: ContactView
    education_level: FieldView
    completion: Completion
    hr_information: tuple[HrItemView, ...] = ()
    relationships: tuple[Choice, ...] = RELATIONSHIPS
    education_levels: tuple[EducationLevel, ...] = EDUCATION_LEVELS


def _proposed_phone(value: str) -> str:
    """Le numéro de l'export, mis au format du portail quand il le permet."""
    try:
        return clean_phone(value, field="telephone")
    except InvalidDossierField:
        return value


def _completed(dossier: Dossier, dates: dict[str, datetime], reports: list[Report]) -> set[str]:
    """Les éléments de RG-01 complets : ceux du dossier, et agence, poste, date d'embauche confirmés ou signalés."""
    return dossier.done() | hr_done(set(dates), reports)


class GetMyDossier:
    """Le dossier de l'employé. CA-05 de US-203 : à la lecture, une date d'embauche moins de 18 ans après
    la naissance crée une seule fois un signalement automatique aux RH, sans bloquer l'employé (RG-16)."""

    def __init__(
        self, dossiers: DossierRepository, export: ExportContact, hr_source: HrInformationSource, clock: Clock
    ) -> None:
        self._dossiers = dossiers
        self._export = export
        self._hr_source = hr_source
        self._clock = clock

    def execute(self, employee_id: str) -> DossierView:
        dossier = self._dossiers.get(employee_id) or Dossier(employee_id)
        export = self._export.execute(employee_id)
        hr = self._hr_source.execute(employee_id)
        reports = self._check_hire_date(employee_id, hr)
        dates = ConfirmationDates.of(self._dossiers.confirmations(employee_id)).latest
        done = _completed(dossier, dates, reports)

        def field(information: Information, value: str | None, proposed: str | None) -> FieldView:
            return FieldView(value if value else (proposed or None), information.value in done, dates.get(information.value))

        contact = dossier.emergency_contact
        email_done = Information.EMAIL.value in done
        return DossierView(
            consent=ConsentState.of(self._dossiers.consents(employee_id)),
            telephone=field(Information.TELEPHONE, dossier.telephone, _proposed_phone(export.get("telephone", ""))),
            address=field(Information.ADDRESS, dossier.address, export.get("address")),
            email=EmailView(
                dossier.email if email_done else (export.get("email") or None),
                email_done,
                dates.get(Information.EMAIL.value),
                no_email=dossier.no_email,
            ),
            emergency_contact=ContactView(
                contact.name if contact else None,
                contact.relationship if contact else None,
                contact.telephone if contact else None,
                contact is not None,
                dates.get(Information.EMERGENCY_CONTACT.value),
            ),
            education_level=field(Information.EDUCATION_LEVEL, dossier.education_level, None),
            completion=completion(done),
            hr_information=tuple(
                HrItemView(item.value, LABELS[item], hr.value_of(item), *hr_status(item, dates.get(item.value), reports))
                for item in HrItem
            ),
        )

    def _check_hire_date(self, employee_id: str, hr) -> list[Report]:
        reports = self._dossiers.reports(employee_id)
        already = any(r.origin == ReportOrigin.AUTOMATIC and r.information == HrItem.HIRE_DATE.value for r in reports)
        if already or not hired_too_young(hr.birth_date, hr.hire_date):
            return reports
        report = Report(
            employee_id,
            HrItem.HIRE_DATE.value,
            ReportOrigin.AUTOMATIC,
            hr.value_of(HrItem.HIRE_DATE),
            None,
            "Date d'embauche moins de 18 ans après la date de naissance (RG-16).",
            self._clock.now(),
        )
        self._dossiers.add_report(report)
        return [*reports, report]


class GetDossierSummary:
    """Ce que le profil (module `employee`) lit du dossier : éléments complets et coordonnées confirmées."""

    def __init__(self, dossiers: DossierRepository) -> None:
        self._dossiers = dossiers

    def execute(self, employee_id: str) -> DossierSummary:
        dossier = self._dossiers.get(employee_id) or Dossier(employee_id)
        dates = ConfirmationDates.of(self._dossiers.confirmations(employee_id)).latest
        done = _completed(dossier, dates, self._dossiers.reports(employee_id))
        return DossierSummary(done, dossier.telephone, dossier.address, dossier.email)


class GiveConsent:
    """CA-01 : mention d'information lue et acceptée, une seule fois (D-09) ; choix WhatsApp facultatif."""

    def __init__(self, dossiers: DossierRepository, clock: Clock) -> None:
        self._dossiers = dossiers
        self._clock = clock

    def execute(self, employee_id: str, information_notice: bool, whatsapp: bool) -> None:
        if not information_notice:
            raise NoticeNotAccepted()
        state = ConsentState.of(self._dossiers.consents(employee_id))
        now = self._clock.now()
        added = []
        if state.information_notice_at is None:
            added.append(Consent(employee_id, ConsentSubject.INFORMATION_NOTICE, True, now))
        if state.whatsapp != whatsapp:
            added.append(Consent(employee_id, ConsentSubject.WHATSAPP, whatsapp, now))
        if added:
            self._dossiers.add_consents(added)


class _SaveSection:
    """Enregistre une section : tout ou rien, et une confirmation datée par information renseignée (CA-05)."""

    def __init__(self, dossiers: DossierRepository, export: ExportContact, clock: Clock) -> None:
        self._dossiers = dossiers
        self._export = export
        self._clock = clock

    def _save(self, employee_id: str, update, informations: tuple[Information, ...]) -> None:
        if ConsentState.of(self._dossiers.consents(employee_id)).information_notice_at is None:
            raise ConsentRequired()
        dossier = self._dossiers.get(employee_id) or Dossier(employee_id)
        export = self._export.execute(employee_id)
        before = {information: dossier.value_of(information) for information in informations}
        update(dossier)

        now = self._clock.now()
        confirmations = []
        for information in informations:
            new = dossier.value_of(information)
            if not new:
                continue
            previous = before[information] or _export_value(export, information)
            confirmations.append(
                Confirmation(employee_id, information.value, gesture(previous, new), previous or None, new, now)
            )
        self._dossiers.save(dossier, confirmations)


def _export_value(export: dict[str, str], information: Information) -> str | None:
    value = export.get(information.value) or None
    if value and information == Information.TELEPHONE:
        return _proposed_phone(value)
    return value


class SaveCoordinates(_SaveSection):
    """Section 1 / 3 : téléphone, adresse, email ou « Je n'ai pas d'adresse email » (CA-02, CA-03)."""

    def execute(self, employee_id: str, telephone: str, address: str, email: str, no_email: bool) -> None:
        values = {
            "telephone": clean_phone(telephone, field="telephone") if normalize_text(telephone) else None,
            "address": clean_address(address) if normalize_text(address) else None,
            "email": clean_email(email) if normalize_text(email) and not no_email else None,
        }

        def update(dossier: Dossier) -> None:
            dossier.telephone = values["telephone"]
            dossier.address = values["address"]
            dossier.email = values["email"]
            dossier.no_email = no_email

        self._save(employee_id, update, (Information.TELEPHONE, Information.ADDRESS, Information.EMAIL))


class SaveContactAndEducation(_SaveSection):
    """Section 2 / 3 : contact d'urgence (nom, lien dans une liste, téléphone) et niveau d'études (CA-04)."""

    def execute(self, employee_id: str, name: str, relationship: str, telephone: str, education_level: str) -> None:
        contact = _contact(name, relationship, telephone)
        level = clean_education_level(education_level) if education_level else None

        def update(dossier: Dossier) -> None:
            dossier.emergency_contact = contact
            dossier.education_level = level

        self._save(employee_id, update, (Information.EMERGENCY_CONTACT, Information.EDUCATION_LEVEL))


def _contact(name: str, relationship: str, telephone: str) -> EmergencyContact | None:
    """Vide : pas encore renseigné. Commencé : les trois valeurs sont demandées (RG-13)."""
    if not (normalize_text(name) or relationship or normalize_text(telephone)):
        return None
    if not normalize_text(name):
        raise InvalidDossierField("Saisissez le nom de la personne à contacter.", field="contact_name")
    if not relationship:
        raise InvalidDossierField("Choisissez votre lien avec cette personne.", field="contact_relationship")
    if not normalize_text(telephone):
        raise InvalidDossierField("Ajoutez le numéro de téléphone de cette personne.", field="contact_telephone")
    return EmergencyContact(
        clean_contact_name(name),
        clean_relationship(relationship),
        clean_phone(telephone, field="contact_telephone"),
    )


def _known_item(raw: str) -> HrItem:
    item = hr_item(raw)
    if item is None:
        raise UnknownHrInformation()
    return item


class ConfirmHrInformation:
    """US-203 CA-02 : « Ces informations sont exactes » enregistre la date de confirmation."""

    def __init__(self, dossiers: DossierRepository, hr_source: HrInformationSource, clock: Clock) -> None:
        self._dossiers = dossiers
        self._hr_source = hr_source
        self._clock = clock

    def execute(self, employee_id: str, key: str) -> None:
        item = _known_item(key)
        value = self._hr_source.execute(employee_id).value_of(item)
        self._dossiers.add_confirmation(
            Confirmation(employee_id, item.value, Gesture.CONFIRMATION, value or None, value, self._clock.now())
        )


class ReportHrError:
    """US-203 CA-03 : « Signaler une erreur » enregistre la date, la valeur actuelle, la bonne information et la précision."""

    def __init__(self, dossiers: DossierRepository, hr_source: HrInformationSource, clock: Clock) -> None:
        self._dossiers = dossiers
        self._hr_source = hr_source
        self._clock = clock

    def execute(self, employee_id: str, key: str, correct_value: str, comment: str) -> None:
        item = _known_item(key)
        value, note = clean_report(correct_value, comment)
        current = self._hr_source.execute(employee_id).value_of(item)
        self._dossiers.add_report(
            Report(employee_id, item.value, ReportOrigin.EMPLOYEE, current, value, note, self._clock.now())
        )


class GetHrValues:
    """Agence (libellé officiel du référentiel), poste, date d'embauche et date de naissance de l'export."""

    def __init__(self, employees: EmployeeRepository, units: UnitDirectory) -> None:
        self._employees = employees
        self._units = units

    def execute(self, employee_id: str) -> HrValues:
        employee = get_employee(self._employees, employee_id)
        agency = self._units.execute(employee.agency_code, employee.department).agency
        return HrValues(agency, employee.position, employee.hire_date, employee.birth_date)


class IsProfileComplete:
    """US-204 : les 8 éléments de RG-01 sont complets ; c'est ce qui ouvre le dépôt de certificats (RG-07)."""

    def __init__(self, dossiers: DossierRepository) -> None:
        self._summary = GetDossierSummary(dossiers)

    def execute(self, employee_id: str) -> bool:
        return completion(self._summary.execute(employee_id).done).is_complete
