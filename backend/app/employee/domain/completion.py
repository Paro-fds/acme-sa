"""US-201 : « Votre dossier est complet à X % » (EF-206 ; RG-01, RG-05, D-03).

Calculé, jamais stocké (modèle de données, principe n° 6) : chacun des 8 éléments du profil complet compte
pour un point ; % = éléments complets ÷ 8, tronqué à l'entier (5 sur 8 = 62 %, comme la maquette 06) :
on n'affiche jamais plus que ce qui est fait.
"""

from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(frozen=True)
class Element:
    key: str
    label: str


ELEMENTS = (
    Element("telephone", "Téléphone"),
    Element("address", "Adresse"),
    Element("email", "Email"),
    Element("emergency_contact", "Contact d'urgence"),
    Element("education_level", "Niveau d'études"),
    Element("agency_confirmed", "Agence confirmée"),
    Element("position_confirmed", "Poste confirmé"),
    Element("hire_date_confirmed", "Date d'embauche confirmée"),
)
"""RG-01 : les 8 éléments qui rendent le profil complet et débloquent le dépôt de certificat."""


@dataclass(frozen=True)
class Completion:
    done: frozenset[str]

    @property
    def total(self) -> int:
        return len(ELEMENTS)

    @property
    def complete(self) -> int:
        return sum(1 for element in ELEMENTS if element.key in self.done)

    @property
    def percent(self) -> int:
        return 100 * self.complete // self.total

    @property
    def is_complete(self) -> bool:
        return self.complete == self.total


def completion(done: Iterable[str]) -> Completion:
    return Completion(frozenset(done))
