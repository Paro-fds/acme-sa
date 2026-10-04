"""T-18.1 : correspondance d'un terme de recherche avec un employé (US-18)."""

import pytest

from app.admin.domain.search import matches_search

JOSEPH = {"names": [("JOSEPH", "Jean")], "employee_code": "AC-1001"}
ETIENNE = {"names": [("ÉTIENNE", "Rosé")], "employee_code": "AC-1007"}
RENAMED = {"names": [("JOSEPH", "Jean"), ("JOSEPH-PAUL", "Jean")], "employee_code": "AC-1001"}


@pytest.mark.parametrize(
    ("term", "employee", "expected"),
    [
        ("joseph", JOSEPH, True),  # CA-01 : nom
        ("jos", JOSEPH, True),  # CA-02 : saisie partielle
        ("Jean", JOSEPH, True),  # prénom
        ("ETIENNE", ETIENNE, True),  # CA-03 : accents et casse ignorés
        ("étienne", ETIENNE, True),
        ("rose", ETIENNE, True),
        ("jean joseph", JOSEPH, True),  # CA-04 : prénom + nom
        ("joseph jean", JOSEPH, True),  # nom + prénom
        ("  joseph    jean ", JOSEPH, True),  # espaces réduits
        ("joseph je", JOSEPH, True),
        ("AC-1001", JOSEPH, True),  # CA-05 : matricule
        ("1001", JOSEPH, True),  # partie du matricule
        ("ac-10", JOSEPH, True),
        ("paul", RENAMED, True),  # CA-06 : nouveau nom soumis
        ("joseph-paul jean", RENAMED, True),
        ("joseph jean", RENAMED, True),  # l'ancien nom reste trouvable
        ("paul", JOSEPH, False),
        ("zzz", JOSEPH, False),  # CA-07
        ("jean etienne", JOSEPH, False),  # mélange de deux employés
        ("pierre", JOSEPH, False),
    ],
)
def test_matches_search(term, employee, expected):
    assert matches_search(term, **employee) is expected


@pytest.mark.parametrize("term", ["", "   ", None])
def test_empty_term_matches_everyone(term):
    assert matches_search(term, **JOSEPH) is True
