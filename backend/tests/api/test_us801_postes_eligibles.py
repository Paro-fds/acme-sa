"""US-801 (choix du 2026-10-11) : un poste publié n'apparaît qu'aux employés aptes, sur leurs données validées."""

from datetime import date

import pytest

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A, EMP_B, EMP_E
from tests.referential import workbook

MY_OPENINGS = "/api/me/openings"
OPENINGS = "/api/admin/openings"


@pytest.fixture(autouse=True)
def referential(admin_client):
    response = admin_client.post(
        "/api/admin/referential/import",
        files={"file": ("referentiel.xlsx", workbook(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200, response.text


def _certificate(container, employee_id, level, domain, status=CertificateStatus.VALIDATED, suffix="1"):
    certificate_id = f"cert-{employee_id}-{suffix}"
    container.certificates.add(
        Certificate(
            certificate_id, employee_id, "DIPLOME", level, "Diplôme fictif", "Université fictive", 2015, None, domain,
            None, status, container.clock.now(),
        ),
        CertificateFile(certificate_id, f"certs/{certificate_id}.pdf", "fictif.pdf", "application/pdf", 1024),
    )


def _publish(admin_client, code="CC-2026-01", opens_on="2026-10-01", closes_on="2026-11-15", **criteria):
    created = admin_client.post(
        OPENINGS,
        json={
            "code": code,
            "title": f"Poste {code}",
            "unit_code": "AD",
            "target_grade": "12",
            "mission": "Mission fictive.",
            "opens_on": opens_on,
            "closes_on": closes_on,
            "criteria": criteria,
        },
    )
    assert created.status_code == 201, created.text
    assert admin_client.post(f"{OPENINGS}/{created.json()['id']}/publish").status_code == 200
    return created.json()


def _codes(client):
    response = client.get(MY_OPENINGS)
    assert response.status_code == 200, response.text
    return [item["code"] for item in response.json()["items"]]


def test_l_employe_apte_voit_le_poste_publie(admin_client, employee_client, container, clock):
    # EMP_A : embauché le 03/09/2018, grade 12, agence PV (région M1), Direction Crédit.
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE")
    _publish(
        admin_client, min_level="LICENCE", domain="FINANCE", min_years_in_institution=5, min_years_in_position=5,
        min_grade="10", unit_code="M1",
    )
    response = employee_client(EMP_A).get(MY_OPENINGS)
    [item] = response.json()["items"]
    assert item["code"] == "CC-2026-01"
    assert item["title"] == "Poste CC-2026-01"
    assert item["unit_label"] == "Agence Démo"
    assert item["closes_on"] == "2026-11-15"
    assert item["mission"] == "Mission fictive."
    assert item["criteria_lines"][0] == "Niveau d'études minimum : Licence"


def test_l_employe_qui_ne_remplit_pas_un_critere_ne_le_voit_pas(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE")
    _certificate(container, EMP_E.id, "MASTER", "FINANCE")
    _publish(admin_client, min_level="LICENCE", domain="FINANCE", min_grade="15")
    assert _codes(employee_client(EMP_A)) == []  # grade 12
    assert _codes(employee_client(EMP_E)) == ["CC-2026-01"]  # grade 18


def test_seuls_les_certificats_valides_comptent(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "MASTER", "FINANCE", status=CertificateStatus.RECEIVED)
    _publish(admin_client, min_level="LICENCE")
    assert _codes(employee_client(EMP_A)) == []


def test_l_anciennete_compte(admin_client, employee_client):
    # EMP_B : embauché le 01/03/2024 ; EMP_E : le 20/10/2005.
    _publish(admin_client, min_years_in_institution=3)
    assert _codes(employee_client(EMP_B)) == []
    assert _codes(employee_client(EMP_E)) == ["CC-2026-01"]


def test_seuls_les_postes_publies_et_ouverts_apparaissent(admin_client, employee_client, clock):
    # Horloge des tests : 04/10/2026.
    _publish(admin_client, code="OUVERT")
    _publish(admin_client, code="PAS-ENCORE", opens_on="2026-10-20")
    _publish(admin_client, code="PASSE", opens_on="2026-09-01", closes_on="2026-10-01")
    cloture = _publish(admin_client, code="CLOTURE")
    admin_client.post(f"{OPENINGS}/{cloture['id']}/close")
    admin_client.post(
        OPENINGS,
        json={
            "code": "BROUILLON", "title": "Brouillon", "unit_code": "AD", "target_grade": "12", "mission": "M.",
            "opens_on": "2026-10-01", "closes_on": "2026-11-15",
        },
    )
    assert _codes(employee_client(EMP_A)) == ["OUVERT"]


def test_la_route_est_reservee_a_l_employe_connecte(client, admin_client):
    assert client.get(MY_OPENINGS).status_code == 401
    assert admin_client.get(MY_OPENINGS).status_code in (401, 403)
