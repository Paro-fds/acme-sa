"""US-201 CA-02 : « Votre dossier est complet à X % » = éléments complets ÷ 8, tronqué à l'entier (RG-01, RG-05, D-03)."""

import pytest

from app.employee.domain.completion import ELEMENTS, completion


def test_les_8_elements_du_profil_complet_dans_l_ordre_de_rg01():
    assert [element.key for element in ELEMENTS] == [
        "telephone",
        "address",
        "email",
        "emergency_contact",
        "education_level",
        "agency_confirmed",
        "position_confirmed",
        "hire_date_confirmed",
    ]
    assert [element.label for element in ELEMENTS] == [
        "Téléphone",
        "Adresse",
        "Email",
        "Contact d'urgence",
        "Niveau d'études",
        "Agence confirmée",
        "Poste confirmé",
        "Date d'embauche confirmée",
    ]


@pytest.mark.parametrize(
    ("complete", "percent"),
    [(0, 0), (1, 12), (2, 25), (3, 37), (4, 50), (5, 62), (6, 75), (7, 87), (8, 100)],
)
def test_ca02_chaque_element_compte_pour_un_point_tronque_a_l_entier(complete, percent):
    done = {element.key for element in ELEMENTS[:complete]}

    result = completion(done)

    assert (result.complete, result.total, result.percent) == (complete, 8, percent)


def test_ca02_100_pour_cent_seulement_quand_les_8_sont_completes():
    seven = {element.key for element in ELEMENTS[1:]}

    assert completion(seven).percent == 87
    assert not completion(seven).is_complete
    assert completion({element.key for element in ELEMENTS}).is_complete


def test_un_element_inconnu_ne_compte_pas():
    assert completion({"telephone", "salaire"}).complete == 1
