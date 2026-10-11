from dataclasses import dataclass
from datetime import datetime

from app.admin.domain.search import matches_search
from app.certificate.domain.certificate import Certificate, CertificateStatus
from app.certificate.domain.ports import CertificateRepository
from app.dossier.application.use_cases import IsProfileComplete
from app.dossier.domain.ports import DossierRepository
from app.employee.domain.repository import EmployeeRepository
from app.referential.domain.ports import ReferentialRepository
from app.shared.domain.levels import LEVELS_BY_CODE


@dataclass(frozen=True)
class QualifiedEmployeeItemView:
    id: str
    employee_code: str
    last_name: str
    first_name: str
    display_name: str
    agency_code: str
    agency_name: str
    region_code: str
    region_name: str
    direction_code: str
    direction_name: str
    position: str
    folder_status: str  # 'FOLDER_COMPLETE', 'PROFILE_COMPLETE', 'INCOMPLETE'
    folder_status_label: str  # 'Dossier complet', 'Profil complet', 'Profil incomplet'
    validated_level: str | None
    validated_level_label: str | None
    validated_rank: int | None
    validated_domain: str | None
    validated_domain_label: str | None
    updated_at: datetime | None


@dataclass(frozen=True)
class QualifiedEmployeesSearchResult:
    items: list[QualifiedEmployeeItemView]
    total: int


DOMAIN_LABELS = {
    "COMPTABILITE": "Comptabilité",
    "GESTION": "Gestion",
    "FINANCE": "Finance",
    "ECONOMIE": "Économie",
    "INFORMATIQUE": "Informatique",
    "DROIT": "Droit",
    "AGRONOMIE": "Agronomie",
    "AUTRE": "Autre",
}

FOLDER_STATUS_LABELS = {
    "FOLDER_COMPLETE": "Dossier complet",
    "PROFILE_COMPLETE": "Profil complet",
    "INCOMPLETE": "Profil incomplet",
}

MIN_LEVEL_RANKS = {
    "au moins Licence": 6,
    "LICENCE": 6,
    "au moins Master": 7,
    "MASTER": 7,
    "au moins Baccalauréat": 3,
    "BACCALAUREAT": 3,
    "au moins Bac + 2": 5,
    "BAC_PLUS_2": 5,
}


class SearchQualifiedEmployees:
    """US-602 : Recherche multi-critères des employés qualifiés (Écran A06)."""

    def __init__(
        self,
        employees: EmployeeRepository,
        dossiers: DossierRepository,
        certificates: CertificateRepository,
        referentials: ReferentialRepository,
    ) -> None:
        self._employees = employees
        self._dossiers = dossiers
        self._certificates = certificates
        self._referentials = referentials
        self._is_profile_complete = IsProfileComplete(dossiers)

    def execute(
        self,
        search: str | None = None,
        agency: str | None = None,
        region: str | None = None,
        direction: str | None = None,
        folder_status: str | None = None,
        min_level: str | None = None,
        domain: str | None = None,
    ) -> QualifiedEmployeesSearchResult:
        all_employees = self._employees.list_all()
        all_certs = self._certificates.list_all()
        units = self._referentials.units()
        attachments = self._referentials.current_attachments()

        # Indexer les certificats validés par employé (CA-02)
        validated_certs_by_emp: dict[str, list[Certificate]] = {}
        for c in all_certs:
            if c.status == CertificateStatus.VALIDATED:
                validated_certs_by_emp.setdefault(c.employee_id, []).append(c)

        items: list[QualifiedEmployeeItemView] = []

        for emp in all_employees:
            names = {(emp.last_name, emp.first_name)}
            if not matches_search(search, names=names, employee_code=emp.employee_code):
                continue

            # Agence, Région, Direction
            ag_code = emp.agency_code or ""
            ag_unit = units.get(ag_code)
            ag_name = ag_unit.label if ag_unit else (ag_code or "Non affecté")

            att = attachments.get(ag_code)
            reg_code = att.parent_code if att else ""
            reg_unit = units.get(reg_code)
            reg_name = reg_unit.label if reg_unit else "Région Non affectée"

            dir_code = emp.department or ""
            dir_unit = units.get(dir_code)
            dir_name = dir_unit.label if dir_unit else (dir_code or "Non affecté")

            # Filtres structurels
            if agency and agency != "Toutes" and ag_code != agency and ag_name != agency:
                continue
            if region and region != "Toutes" and reg_code != region and reg_name != region:
                continue
            if direction and direction != "Toutes" and dir_code != direction and dir_name != direction:
                continue

            # Statut du dossier et qualifications
            prof_complete = self._is_profile_complete.execute(emp.id)
            val_certs = validated_certs_by_emp.get(emp.id, [])

            # Calcul du niveau validé le plus élevé (RG-30)
            best_rank = None
            best_level_code = None
            best_domain_code = None
            latest_cert_at = None

            for vc in val_certs:
                lvl = LEVELS_BY_CODE.get(vc.level)
                rank = lvl.rank if lvl else 0
                if best_rank is None or (rank is not None and rank > best_rank):
                    best_rank = rank
                    best_level_code = vc.level
                    best_domain_code = vc.domain
                if latest_cert_at is None or (vc.submitted_at and vc.submitted_at > latest_cert_at):
                    latest_cert_at = vc.submitted_at

            if prof_complete and val_certs:
                status_key = "FOLDER_COMPLETE"
            elif prof_complete:
                status_key = "PROFILE_COMPLETE"
            else:
                status_key = "INCOMPLETE"

            status_lbl = FOLDER_STATUS_LABELS[status_key]

            # Filtre par statut du dossier
            if folder_status and folder_status != "Tous":
                if folder_status != status_key and folder_status != status_lbl:
                    continue

            # Filtre par niveau validé minimum (CA-01)
            if min_level and min_level != "Tous":
                req_rank = MIN_LEVEL_RANKS.get(min_level)
                if req_rank is not None:
                    if best_rank is None or best_rank < req_rank:
                        continue

            # Filtre par domaine (CA-01)
            if domain and domain != "Tous":
                emp_domains = [vc.domain for vc in val_certs if vc.domain]
                emp_domain_labels = [DOMAIN_LABELS.get(d, d) for d in emp_domains]
                if domain not in emp_domains and domain not in emp_domain_labels:
                    continue

            best_level_obj = LEVELS_BY_CODE.get(best_level_code) if best_level_code else None
            level_label = best_level_obj.label if best_level_obj else None
            domain_label = DOMAIN_LABELS.get(best_domain_code, best_domain_code) if best_domain_code else None

            items.append(
                QualifiedEmployeeItemView(
                    id=emp.id,
                    employee_code=emp.employee_code,
                    last_name=emp.last_name,
                    first_name=emp.first_name,
                    display_name=f"{emp.first_name} {emp.last_name}",
                    agency_code=ag_code,
                    agency_name=ag_name,
                    region_code=reg_code,
                    region_name=reg_name,
                    direction_code=dir_code,
                    direction_name=dir_name,
                    position=emp.position,
                    folder_status=status_key,
                    folder_status_label=status_lbl,
                    validated_level=best_level_code,
                    validated_level_label=level_label,
                    validated_rank=best_rank,
                    validated_domain=best_domain_code,
                    validated_domain_label=domain_label,
                    updated_at=latest_cert_at,
                )
            )

        items.sort(key=lambda x: (x.last_name, x.first_name))
        return QualifiedEmployeesSearchResult(items=items, total=len(items))
