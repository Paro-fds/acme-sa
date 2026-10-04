from dataclasses import dataclass


@dataclass(frozen=True)
class CampaignStatistics:
    """US-16 : avancement de la campagne (deux statuts seulement : effectuée / non effectuée)."""

    total: int
    updated: int
    not_updated: int
    progress: int
    """Pourcentage d'employés ayant soumis, arrondi à l'entier le plus proche (moitié vers le haut)."""

    @classmethod
    def compute(cls, total: int, updated: int) -> "CampaignStatistics":
        if not 0 <= updated <= total:
            raise ValueError("updated doit être compris entre 0 et total")
        # Arrondi en entiers : (100 × updated / total) + 0,5, tronqué ; 0 % s'il n'y a aucun employé.
        progress = (200 * updated + total) // (2 * total) if total else 0
        return cls(total=total, updated=updated, not_updated=total - updated, progress=progress)
