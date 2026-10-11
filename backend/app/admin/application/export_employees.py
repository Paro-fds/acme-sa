"""US-603 : Exporter la liste filtrée en Excel ou CSV (EF-604, D-18).

- CA-01 : L'export reprend exactement les filtres affichés.
- CA-02 : Il ne contient jamais le contact d'urgence ni de salaire ;
          chaque export est tracé dans le journal d'audit (qui, quand, quels filtres).
- D-18 : Réservé à l'Administrateur seul.
"""

import csv
import io
from dataclasses import dataclass
from datetime import datetime
import openpyxl

from app.admin.application.search_qualified_employees import SearchQualifiedEmployees
from app.admin.domain.audit import AuditAction, AuditEntry, AuditRepository
from app.shared.domain.clock import Clock


EXPORT_COLUMNS = [
    ("employee_code", "Matricule"),
    ("last_name", "Nom"),
    ("first_name", "Prénom"),
    ("agency_name", "Agence"),
    ("direction_name", "Direction"),
    ("region_name", "Région"),
    ("position", "Poste"),
    ("folder_status_label", "Statut du dossier"),
    ("validated_level_label", "Niveau validé"),
    ("validated_domain_label", "Domaine"),
    ("updated_at", "Dernière mise à jour"),
]


@dataclass(frozen=True)
class ExportResult:
    content: bytes
    media_type: str
    filename: str


class ExportEmployeesList:
    def __init__(
        self,
        search_qualified: SearchQualifiedEmployees,
        audit_repo: AuditRepository,
        clock: Clock,
    ) -> None:
        self._search_qualified = search_qualified
        self._audit_repo = audit_repo
        self._clock = clock

    def execute(
        self,
        actor_id: str,
        actor_name: str | None = None,
        search: str | None = None,
        agency: str | None = None,
        region: str | None = None,
        direction: str | None = None,
        folder_status: str | None = None,
        min_level: str | None = None,
        domain: str | None = None,
        export_format: str = "csv",
    ) -> ExportResult:
        result = self._search_qualified.execute(
            search=search,
            agency=agency,
            region=region,
            direction=direction,
            folder_status=folder_status,
            min_level=min_level,
            domain=domain,
        )

        now = self._clock.now()
        date_str = now.strftime("%Y%m%d_%H%M%S")

        # Tracer l'export dans l'audit_log (CA-02)
        filter_summary = ", ".join(
            f"{k}={v}"
            for k, v in [
                ("search", search),
                ("agency", agency),
                ("region", region),
                ("direction", direction),
                ("folder_status", folder_status),
                ("min_level", min_level),
                ("domain", domain),
            ]
            if v
        ) or "aucun"

        self._audit_repo.add(
            AuditEntry(
                id=None,
                at=now,
                actor_id=actor_id,
                actor_name=actor_name or actor_id,
                action=AuditAction.EXPORT.value,
                target_id="EMPLOYEES_EXPORT",
                target_name=f"Export {export_format.upper()} ({len(result.items)} employés)",
                details=f"Filtres: {filter_summary}",
            )
        )

        if export_format.lower() == "xlsx":
            return self._generate_excel(result.items, date_str)
        return self._generate_csv(result.items, date_str)

    def _generate_csv(self, items: list, date_str: str) -> ExportResult:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        # En-têtes
        writer.writerow([label for _, label in EXPORT_COLUMNS])

        # Lignes
        for item in items:
            row = []
            for col_key, _ in EXPORT_COLUMNS:
                val = getattr(item, col_key, "")
                if isinstance(val, datetime):
                    val = val.strftime("%d/%m/%Y")
                elif val is None:
                    val = ""
                row.append(str(val))
            writer.writerow(row)

        # UTF-8 avec BOM pour compatibilité Excel
        content = ("\ufeff" + output.getvalue()).encode("utf-8")
        return ExportResult(
            content=content,
            media_type="text/csv; charset=utf-8",
            filename=f"employes_export_{date_str}.csv",
        )

    def _generate_excel(self, items: list, date_str: str) -> ExportResult:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Employés"

        # En-têtes
        ws.append([label for _, label in EXPORT_COLUMNS])

        # Lignes
        for item in items:
            row = []
            for col_key, _ in EXPORT_COLUMNS:
                val = getattr(item, col_key, "")
                if isinstance(val, datetime):
                    val = val.strftime("%d/%m/%Y")
                elif val is None:
                    val = ""
                row.append(str(val))
            ws.append(row)

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return ExportResult(
            content=stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"employes_export_{date_str}.xlsx",
        )
