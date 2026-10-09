"""Échelle des niveaux (tableau unique des règles §7.4) : la même pour le niveau déclaré au profil (RG-14)
et pour les certificats (RG-23), pour comparer le niveau déclaré et le niveau prouvé.

🟡 Liste de départ, à aligner sur la grille de classification des postes de la DRH (Q3 §5).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Level:
    code: str
    rank: int | None
    """Rang 1 à 8, invisible pour l'employé ; `None` pour les deux niveaux hors échelle."""
    label: str
    examples: str

    @property
    def on_scale(self) -> bool:
        """Compte dans le niveau d'études (les deux niveaux hors échelle n'y comptent pas)."""
        return self.rank is not None


LEVELS = (
    Level("PRIMAIRE", 1, "Primaire / Fondamental", "Certificat d'études primaires, école fondamentale 1er et 2e cycle."),
    Level("SECONDAIRE", 2, "Secondaire", "3e cycle fondamental, études secondaires générales."),
    Level("BACCALAUREAT", 3, "Baccalauréat", "Baccalauréat 1re ou 2e partie / Philo."),
    Level(
        "FORMATION_PRO", 4, "Formation professionnelle / Technique",
        "Certificat ou diplôme d'aptitude professionnelle, école technique.",
    ),
    Level("BAC_PLUS_2", 5, "Technicien supérieur / Bac + 2", "BTS, diplôme universitaire de technologie ou équivalent."),
    Level("LICENCE", 6, "Licence", "Licence universitaire Bac + 3 ou Bac + 4."),
    Level("MASTER", 7, "Master", "Master 1 ou 2, maîtrise."),
    Level("DOCTORAT", 8, "Doctorat", "Doctorat, PhD."),
    Level(
        "CERTIFICATION_PRO", None, "Certification professionnelle",
        "Comptabilité, gestion de risque, microfinance, informatique…",
    ),
    Level("FORMATION_CONTINUE", None, "Formation continue / Attestation", "Séminaire, atelier, stage avec attestation."),
)

LEVELS_BY_CODE = {level.code: level for level in LEVELS}
