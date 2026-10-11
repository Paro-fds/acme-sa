from dataclasses import dataclass
from datetime import datetime

from app.certificate.application.validation_queue import count_business_days
from app.certificate.domain.certificate import CertificateStatus
from app.certificate.domain.ports import CertificateRepository
from app.dossier.application.use_cases import IsProfileComplete
from app.dossier.domain.hr_information import ReportStatus
from app.dossier.domain.ports import DossierRepository
from app.employee.domain.repository import EmployeeRepository
from app.referential.domain.ports import ReferentialRepository
from app.shared.domain.clock import Clock


@dataclass(frozen=True)
class DashboardKPI:
    active_employees: int
    complete_folders: int
    complete_folders_percent: int
    target_percent: int
    waiting_certificates: int
    overdue_certificates: int
    rejected_this_month: int


@dataclass(frozen=True)
class FolderDistribution:
    incomplete_profile_count: int
    incomplete_profile_percent: int
    complete_profile_count: int
    complete_profile_percent: int
    complete_folder_count: int
    complete_folder_percent: int


@dataclass(frozen=True)
class ToProcessCounts:
    overdue_certificates: int
    error_reports: int
    to_attach: int


@dataclass(frozen=True)
class UnitBreakdownItem:
    unit_code: str
    unit_label: str
    unit_type: str
    employees_count: int
    complete_folders_percent: int
    received_certificates: int
    waiting_certificates: int
    rejected_certificates: int


@dataclass(frozen=True)
class DashboardView:
    kpi: DashboardKPI
    distribution: FolderDistribution
    to_process: ToProcessCounts
    by_agency: list[UnitBreakdownItem]
    by_region: list[UnitBreakdownItem]
    by_direction: list[UnitBreakdownItem]


class GetPilotDashboard:
    """US-601 : Tableau de bord de pilotage RH complet (Écran A02)."""

    def __init__(
        self,
        employees: EmployeeRepository,
        dossiers: DossierRepository,
        certificates: CertificateRepository,
        referentials: ReferentialRepository,
        clock: Clock,
    ) -> None:
        self._employees = employees
        self._dossiers = dossiers
        self._certificates = certificates
        self._referentials = referentials
        self._clock = clock
        self._is_profile_complete = IsProfileComplete(dossiers)

    def execute(self) -> DashboardView:
        now = self._clock.now()
        all_employees = self._employees.list_all()
        total_employees = len(all_employees)

        # 1. Certificats
        all_certs = self._certificates.list_all()
        validated_employees = {c.employee_id for c in all_certs if c.status == CertificateStatus.VALIDATED}
        waiting_certs = [
            c for c in all_certs if c.status in (CertificateStatus.RECEIVED, CertificateStatus.IN_REVIEW)
        ]
        overdue_certs = [c for c in waiting_certs if count_business_days(c.submitted_at, now) > 5]
        rejected_this_month = [
            c
            for c in all_certs
            if c.status == CertificateStatus.TO_CORRECT
            and c.decided_at
            and c.decided_at.year == now.year
            and c.decided_at.month == now.month
        ]

        # 2. Dossiers employés
        complete_folders_count = 0
        complete_profile_count = 0
        incomplete_profile_count = 0

        # Cache d'état par employé
        emp_status: dict[str, str] = {}  # 'FOLDER_COMPLETE', 'PROFILE_COMPLETE', 'INCOMPLETE'
        for emp in all_employees:
            prof_complete = self._is_profile_complete.execute(emp.id)
            if prof_complete and emp.id in validated_employees:
                emp_status[emp.id] = "FOLDER_COMPLETE"
                complete_folders_count += 1
            elif prof_complete:
                emp_status[emp.id] = "PROFILE_COMPLETE"
                complete_profile_count += 1
            else:
                emp_status[emp.id] = "INCOMPLETE"
                incomplete_profile_count += 1

        complete_folders_pct = (100 * complete_folders_count // total_employees) if total_employees else 0
        complete_profile_pct = (100 * complete_profile_count // total_employees) if total_employees else 0
        incomplete_profile_pct = (100 * incomplete_profile_count // total_employees) if total_employees else 0

        kpi = DashboardKPI(
            active_employees=total_employees,
            complete_folders=complete_folders_count,
            complete_folders_percent=complete_folders_pct,
            target_percent=90,
            waiting_certificates=len(waiting_certs),
            overdue_certificates=len(overdue_certs),
            rejected_this_month=len(rejected_this_month),
        )

        distribution = FolderDistribution(
            incomplete_profile_count=incomplete_profile_count,
            incomplete_profile_percent=incomplete_profile_pct,
            complete_profile_count=complete_profile_count,
            complete_profile_percent=complete_profile_pct,
            complete_folder_count=complete_folders_count,
            complete_folder_percent=complete_folders_pct,
        )

        # 3. À traiter
        all_reports = self._dossiers.list_all_reports()
        pending_reports = sum(
            1 for r in all_reports if r.status in (ReportStatus.NEW.value, ReportStatus.IN_PROGRESS.value)
        )
        mappings = self._referentials.mappings()
        to_attach_count = sum(1 for m in mappings if not m.unit_code)

        to_process = ToProcessCounts(
            overdue_certificates=len(overdue_certs),
            error_reports=pending_reports,
            to_attach=to_attach_count,
        )

        # 4. Décomposition par agence, région et direction
        units = self._referentials.units()
        attachments = self._referentials.current_attachments()

        # Certificats indexés par employé
        certs_by_emp: dict[str, list] = {}
        for c in all_certs:
            certs_by_emp.setdefault(c.employee_id, []).append(c)

        # Regroupement par agence (code agence de l'employé)
        agency_employees: dict[str, list] = {}
        for emp in all_employees:
            code = emp.agency_code or "AUTRE"
            agency_employees.setdefault(code, []).append(emp)

        def make_breakdown(unit_groups: dict[str, tuple[str, str, list]]) -> list[UnitBreakdownItem]:
            items = []
            for code, (label, utype, emps) in unit_groups.items():
                emp_count = len(emps)
                c_folders = sum(1 for e in emps if emp_status.get(e.id) == "FOLDER_COMPLETE")
                c_pct = (100 * c_folders // emp_count) if emp_count else 0

                unit_certs = [cert for e in emps for cert in certs_by_emp.get(e.id, [])]
                received = len(unit_certs)
                waiting = sum(1 for c in unit_certs if c.status in (CertificateStatus.RECEIVED, CertificateStatus.IN_REVIEW))
                rejected = sum(1 for c in unit_certs if c.status == CertificateStatus.TO_CORRECT)

                items.append(
                    UnitBreakdownItem(
                        unit_code=code,
                        unit_label=label,
                        unit_type=utype,
                        employees_count=emp_count,
                        complete_folders_percent=c_pct,
                        received_certificates=received,
                        waiting_certificates=waiting,
                        rejected_certificates=rejected,
                    )
                )
            return sorted(items, key=lambda x: x.employees_count, reverse=True)

        # Groupes Agence
        agency_groups: dict[str, tuple[str, str, list]] = {}
        for code, emps in agency_employees.items():
            unit = units.get(code)
            lbl = unit.label if unit else (code if code != "AUTRE" else "Non affecté")
            agency_groups[code] = (lbl, "AGENCE", emps)
        by_agency = make_breakdown(agency_groups)

        # Groupes Région
        region_groups: dict[str, tuple[str, str, list]] = {}
        for code, emps in agency_employees.items():
            att = attachments.get(code)
            reg_code = att.parent_code if att else "AUTRE"
            reg_unit = units.get(reg_code)
            reg_lbl = reg_unit.label if reg_unit else "Région Non affectée"
            if reg_code not in region_groups:
                region_groups[reg_code] = (reg_lbl, "REGION", [])
            region_groups[reg_code][2].extend(emps)
        by_region = make_breakdown(region_groups)

        # Groupes Direction (département de l'employé)
        direction_groups: dict[str, tuple[str, str, list]] = {}
        for emp in all_employees:
            dept = emp.department or "AUTRE"
            d_unit = units.get(dept)
            d_lbl = d_unit.label if d_unit else (dept if dept != "AUTRE" else "Non affecté")
            if dept not in direction_groups:
                direction_groups[dept] = (d_lbl, "DIRECTION", [])
            direction_groups[dept][2].append(emp)
        by_direction = make_breakdown(direction_groups)

        return DashboardView(
            kpi=kpi,
            distribution=distribution,
            to_process=to_process,
            by_agency=by_agency,
            by_region=by_region,
            by_direction=by_direction,
        )


@dataclass(frozen=True)
class MenuCounts:
    validation: int
    reports: int
    to_attach: int


class GetMenuCounts:
    """US-108 CA-02 : compteurs du menu de l'espace RH (écran A02), calculés comme au tableau de bord."""

    def __init__(
        self, certificates: CertificateRepository, dossiers: DossierRepository, referentials: ReferentialRepository
    ) -> None:
        self._certificates = certificates
        self._dossiers = dossiers
        self._referentials = referentials

    def execute(self) -> MenuCounts:
        waiting = (CertificateStatus.RECEIVED, CertificateStatus.IN_REVIEW)
        pending = (ReportStatus.NEW.value, ReportStatus.IN_PROGRESS.value)
        return MenuCounts(
            validation=sum(1 for c in self._certificates.list_all() if c.status in waiting),
            reports=sum(1 for r in self._dossiers.list_all_reports() if r.status in pending),
            to_attach=sum(1 for m in self._referentials.mappings() if not m.unit_code),
        )
