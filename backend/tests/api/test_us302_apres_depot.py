"""US-302 — Savoir ce que mon certificat m'apporte (EF-307, EF-607 ; D-10)."""

import pytest

from tests.api.test_us301_depot import _deposit
from tests.conftest import complete_profile
from tests.employees import EMP_A, EMP_B


@pytest.fixture
def deposited(employee_client):
    client = employee_client(EMP_A)
    complete_profile(client)
    return client, _deposit(client).json()


def test_ca01_le_depot_renvoie_le_recapitulatif_et_le_statut_recu(deposited):
    _, certificate = deposited

    assert (certificate["title"], certificate["institution"], certificate["year"], certificate["status_label"]) == (
        "Licence en sciences comptables",
        "Université d'État d'Haïti",
        2019,
        "Reçu",
    )


def test_ca02_ce_que_le_certificat_debloque(deposited):
    _, certificate = deposited

    assert certificate["unlocks"] == {
        "level": "Licence",
        "searchable": "Une fois validé, vous apparaissez dans les recherches des RH pour les promotions et les postes à pourvoir.",
    }


def test_ca02_un_niveau_hors_echelle_ne_devient_pas_le_niveau_d_etudes(employee_client):
    client = employee_client(EMP_A)
    complete_profile(client)

    certificate = _deposit(client, level="CERTIFICATION_PRO", domain="").json()

    assert certificate["unlocks"]["level"] is None


@pytest.mark.parametrize("rating", [1, 2, 3])
def test_ca03_l_avis_en_un_clic_est_enregistre(deposited, container, rating):
    client, certificate = deposited

    response = client.post(f"/api/me/certificates/{certificate['id']}/feedback", json={"rating": rating})

    assert response.status_code == 204
    assert [(f.certificate_id, f.rating) for f in container.certificates.feedbacks()] == [(certificate["id"], rating)]


def test_ca03_un_nouvel_avis_remplace_le_precedent(deposited, container):
    client, certificate = deposited
    client.post(f"/api/me/certificates/{certificate['id']}/feedback", json={"rating": 1})

    client.post(f"/api/me/certificates/{certificate['id']}/feedback", json={"rating": 3})

    assert [f.rating for f in container.certificates.feedbacks()] == [3]


def test_ca03_une_note_hors_echelle_est_refusee(deposited):
    client, certificate = deposited

    assert client.post(f"/api/me/certificates/{certificate['id']}/feedback", json={"rating": 5}).status_code == 422


def test_ca03_on_ne_donne_son_avis_que_sur_ses_propres_certificats(deposited, employee_client):
    _, certificate = deposited

    response = employee_client(EMP_B).post(f"/api/me/certificates/{certificate['id']}/feedback", json={"rating": 3})

    assert response.status_code == 404
