"""US-604 : Rendre compte de chaque action — Consultation du journal d'audit (EF-605, ENF-08).

- CA-01 : Le journal montre qui a modifié quoi et quand, et qui a consulté quel document.
- CA-02 : Personne ne peut modifier ni supprimer une ligne du journal (lecture seule).
- CA-03 : Il se filtre par personne, employé et période.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
import calendar

from app.admin.domain.audit import AUDIT_ACTION_LABELS, AuditEntry, AuditRepository


@dataclass(frozen=True)
class AuditLogItemView:
    id: int
    at: datetime
    actor_id: str
    actor_name: str
    action: str
    action_label: str
    target_id: str
    target_name: str
    details: str | None


@dataclass(frozen=True)
class AuditLogView:
    items: list[AuditLogItemView]
    total: int
    page: int
    page_size: int
    page_count: int
    actors: list[str]
    actions: list[str]


def _parse_period(period: str | None) -> tuple[datetime | None, datetime | None]:
    if not period or period == "Toutes" or period == "Tous":
        return None, None

    # Format "YYYY-MM"
    if "-" in period and len(period) == 7:
        try:
            year, month = map(int, period.split("-"))
            _, last_day = calendar.monthrange(year, month)
            since = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
            until = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
            return since, until
        except ValueError:
            pass

    return None, None


class GetAuditLog:
    def __init__(self, audit_repo: AuditRepository) -> None:
        self._audit_repo = audit_repo

    def execute(
        self,
        actor: str | None = None,
        target: str | None = None,
        action: str | None = None,
        period: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AuditLogView:
        # Récupérer toutes les entrées pour extraire les acteurs et actions disponibles
        all_entries = self._audit_repo.list_all()

        actors_set = set()
        actions_set = set()
        for e in all_entries:
            if e.actor_name:
                actors_set.add(e.actor_name)
            elif e.actor_id:
                actors_set.add(e.actor_id)
            if e.action:
                actions_set.add(e.action)

        since, until = _parse_period(period)

        # Filtrage
        filtered: list[AuditEntry] = []
        for e in all_entries:
            if actor and actor != "Toutes" and actor != "Tous":
                if e.actor_id != actor and e.actor_name != actor:
                    continue
            if target and target != "Tous":
                if target.lower() not in (e.target_id or "").lower() and target.lower() not in (e.target_name or "").lower():
                    continue
            if action and action != "Tous":
                label = AUDIT_ACTION_LABELS.get(e.action, e.action)
                if e.action != action and label != action:
                    continue
            if since and e.at < since:
                continue
            if until and e.at > until:
                continue
            filtered.append(e)

        total = len(filtered)
        page_count = max(1, (total + page_size - 1) // page_size) if total > 0 else 1
        safe_page = max(1, min(page, page_count))
        offset = (safe_page - 1) * page_size
        page_items = filtered[offset : offset + page_size]

        items = [
            AuditLogItemView(
                id=e.id or 0,
                at=e.at,
                actor_id=e.actor_id,
                actor_name=e.actor_name or e.actor_id,
                action=e.action,
                action_label=AUDIT_ACTION_LABELS.get(e.action, e.action),
                target_id=e.target_id,
                target_name=e.target_name or e.target_id,
                details=e.details,
            )
            for e in page_items
        ]

        return AuditLogView(
            items=items,
            total=total,
            page=safe_page,
            page_size=page_size,
            page_count=page_count,
            actors=sorted(actors_set),
            actions=sorted(actions_set),
        )
