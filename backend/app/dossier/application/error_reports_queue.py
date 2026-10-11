from dataclasses import dataclass
from datetime import datetime

from app.dossier.domain.errors import InvalidDossierField
from app.dossier.domain.hr_information import (
    LABELS,
    HrItem,
    Report,
    ReportDecision,
    ReportOrigin,
    ReportStatus,
    REPORT_STATUS_LABELS,
)
from app.dossier.domain.ports import DossierRepository
from app.employee.domain.repository import EmployeeRepository
from app.referential.domain.ports import ReferentialRepository
from app.shared.domain.clock import Clock


@dataclass(frozen=True)
class ErrorReportItemView:
    id: int
    employee_id: str
    employee_name: str
    agency_name: str
    agency_code: str
    field_key: str
    field_label: str
    current_value: str
    indicated_value: str | None
    comment: str | None
    origin: str
    origin_label: str
    at: datetime
    status: str
    status_label: str
    decision: str | None = None
    decided_by: str | None = None
    decided_at: datetime | None = None
    resolution_comment: str | None = None


@dataclass(frozen=True)
class ErrorReportQueueView:
    items: list[ErrorReportItemView]
    total: int
    new_count: int


FIELD_FRIENDLY_LABELS = {
    HrItem.AGENCY.value: "Agence",
    HrItem.POSITION.value: "Poste",
    HrItem.HIRE_DATE.value: "Date d'embauche",
}


def _field_label(raw_key: str) -> str:
    if raw_key in FIELD_FRIENDLY_LABELS:
        return FIELD_FRIENDLY_LABELS[raw_key]
    for item in HrItem:
        if item.value == raw_key:
            return LABELS.get(item, raw_key)
    return raw_key


def _origin_label(origin: ReportOrigin, comment: str | None) -> str:
    if origin == ReportOrigin.AUTOMATIC:
        if comment and "18 ans" in comment:
            return "Contrôle automatique : embauche avant 18 ans"
        return "Contrôle automatique"
    return "Signalé par l'employé"


class GetErrorReportsQueue:
    """US-403 CA-01 & CA-03 : Liste des signalements avec champs, anciennes valeurs, motifs et dates."""

    def __init__(
        self,
        dossiers: DossierRepository,
        employees: EmployeeRepository,
        referentials: ReferentialRepository,
    ) -> None:
        self._dossiers = dossiers
        self._employees = employees
        self._referentials = referentials

    def execute(
        self,
        status: str | None = None,
        origin: str | None = None,
        agency: str | None = None,
    ) -> ErrorReportQueueView:
        all_reports = self._dossiers.list_all_reports()
        employees = {emp.id: emp for emp in self._employees.list_all()}
        units = self._referentials.units()

        views: list[ErrorReportItemView] = []
        new_count = 0

        for r in all_reports:
            if r.id is None:
                continue
            if r.status == ReportStatus.NEW.value:
                new_count += 1

            emp = employees.get(r.employee_id)
            emp_name = f"{emp.first_name} {emp.last_name}" if emp else f"Employé {r.employee_id}"
            agency_code = emp.agency_code if emp else ""
            unit = units.get(agency_code)
            agency_name = unit.label if unit else (agency_code or "Agence inconnue")

            # Filtres
            if status and status != "Tous" and r.status != status:
                # Accepter soit la clé Enum, soit le libellé français
                status_enum = next((k for k, v in REPORT_STATUS_LABELS.items() if v == status or k.value == status), None)
                if not status_enum or r.status != status_enum.value:
                    continue

            if origin and origin != "Toutes":
                if origin == "EMPLOYEE" or origin == "Signalé par l'employé":
                    if r.origin != ReportOrigin.EMPLOYEE:
                        continue
                elif origin == "AUTOMATIC" or origin == "Contrôle automatique":
                    if r.origin != ReportOrigin.AUTOMATIC:
                        continue

            if agency and agency != "Toutes":
                if agency_code != agency and agency_name != agency:
                    continue

            status_enum = None
            try:
                status_enum = ReportStatus(r.status)
            except ValueError:
                pass
            status_lbl = REPORT_STATUS_LABELS.get(status_enum, r.status) if status_enum else r.status

            views.append(
                ErrorReportItemView(
                    id=r.id,
                    employee_id=r.employee_id,
                    employee_name=emp_name,
                    agency_name=agency_name,
                    agency_code=agency_code,
                    field_key=r.information,
                    field_label=_field_label(r.information),
                    current_value=r.current_value,
                    indicated_value=r.indicated_value,
                    comment=r.comment,
                    origin=r.origin.value,
                    origin_label=_origin_label(r.origin, r.comment),
                    at=r.at,
                    status=r.status,
                    status_label=status_lbl,
                    decision=r.decision,
                    decided_by=r.decided_by,
                    decided_at=r.decided_at,
                    resolution_comment=r.resolution_comment,
                )
            )

        return ErrorReportQueueView(items=views, total=len(views), new_count=new_count)


class DecideErrorReport:
    """US-403 CA-02 : Clôture avec une suite donnée et motif/commentaire."""

    def __init__(self, dossiers: DossierRepository, clock: Clock) -> None:
        self._dossiers = dossiers
        self._clock = clock

    def execute(
        self,
        report_id: int,
        admin_id: str,
        decision: str,
        comment: str | None = None,
    ) -> ErrorReportItemView:
        report = self._dossiers.get_report_by_id(report_id)
        if report is None:
            raise InvalidDossierField("Ce signalement n'existe pas.", field="report_id")

        if decision == ReportDecision.INDICATED_IS_CORRECT.value or decision == "La valeur indiquée est juste":
            dec_enum = ReportDecision.INDICATED_IS_CORRECT
            new_status = ReportStatus.CORRECTED
        elif decision == ReportDecision.CURRENT_IS_CORRECT.value or decision == "La valeur actuelle est juste":
            dec_enum = ReportDecision.CURRENT_IS_CORRECT
            new_status = ReportStatus.CLOSED_ACCURATE
        else:
            raise InvalidDossierField("Veuillez choisir une décision valide.", field="decision")

        clean_comment = " ".join((comment or "").split()) or None
        if clean_comment and len(clean_comment) > 500:
            raise InvalidDossierField("Le commentaire ne peut pas dépasser 500 caractères.", field="comment")

        now = self._clock.now()
        updated_report = Report(
            employee_id=report.employee_id,
            information=report.information,
            origin=report.origin,
            current_value=report.current_value,
            indicated_value=report.indicated_value,
            comment=report.comment,
            at=report.at,
            status=new_status.value,
            id=report.id,
            decided_by=admin_id,
            decided_at=now,
            decision=dec_enum.value,
            resolution_comment=clean_comment,
        )
        self._dossiers.update_report(updated_report)

        return ErrorReportItemView(
            id=report.id,
            employee_id=report.employee_id,
            employee_name="",
            agency_name="",
            agency_code="",
            field_key=report.information,
            field_label=_field_label(report.information),
            current_value=report.current_value,
            indicated_value=report.indicated_value,
            comment=report.comment,
            origin=report.origin.value,
            origin_label=_origin_label(report.origin, report.comment),
            at=report.at,
            status=new_status.value,
            status_label=REPORT_STATUS_LABELS[new_status],
            decision=dec_enum.value,
            decided_by=admin_id,
            decided_at=now,
            resolution_comment=clean_comment,
        )
