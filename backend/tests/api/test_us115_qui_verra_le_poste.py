"""US-115 : choisir qui verra un poste — plusieurs unités, plusieurs domaines, aperçu de l'audience."""

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A, EMP_B, EMP_E, EMP_H1
from tests.referential import workbook

OPENINGS = "/api/admin/openings"
AUDIENCE = f"{OPENINGS}/audience"
BACKEND_DIR = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def referential(admin_client):
    response = admin_client.post(
        "/api/admin/referential/import",
        files={"file": ("referentiel.xlsx", workbook(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200, response.text


def _certificate(container, employee_id, level, domain, status=CertificateStatus.VALIDATED):
    certificate_id = f"cert-{employee_id}-{level}"
    container.certificates.add(
        Certificate(
            certificate_id, employee_id, "DIPLOME", level, "Diplôme fictif", "Université fictive", 2015, None, domain,
            None, status, container.clock.now(),
        ),
        CertificateFile(certificate_id, f"certs/{certificate_id}.pdf", "fictif.pdf", "application/pdf", 1024),
    )


@pytest.fixture
def certificates(container):
    # Pétion-Ville : EMP_A (grade 12), EMP_E (grade 18) ; Agence Démo : EMP_H1 (grade 9), EMP_B (sans certificat).
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE")
    _certificate(container, EMP_E.id, "MASTER", "COMPTABILITE")
    _certificate(container, EMP_H1.id, "MASTER", "GESTION")


FICHE = {
    "code": "CC-2026-04",
    "title": "Chargé de crédit",
    "unit_code": "PV",
    "target_grade": "12",
    "mission": "Mission fictive.",
    "opens_on": "2026-10-01",
    "closes_on": "2026-11-15",
}


# --- CA-04, CA-05 : aperçu de l'audience ----------------------------------------------------


def test_ca04_l_apercu_compte_les_employes_et_ce_qui_les_ecarte(admin_client, certificates):
    response = admin_client.post(
        AUDIENCE,
        json={"unit_codes": ["PV", "AD"], "domains": ["COMPTABILITE", "FINANCE"], "min_level": "MASTER", "min_grade": "15"},
    )
    assert response.status_code == 200, response.text
    assert response.json() == {
        "base": 4,
        "base_label": "employés rattachés à Pétion-Ville ou Agence Démo",
        "steps": [
            {"excluded": 2, "reason": "sans certificat validé en Comptabilité ou Finance"},
            {"excluded": 1, "reason": "sans certificat de niveau Master dans ces domaines"},
            {"excluded": 0, "reason": "grade inférieur à 15"},
        ],
        "visible": 1,
    }


def test_ca04_sans_critere_tous_les_employes_en_activite(admin_client):
    body = admin_client.post(AUDIENCE, json={}).json()
    assert (body["base"], body["base_label"], body["steps"], body["visible"]) == (7, "employés en activité", [], 7)


def test_ca04_un_certificat_en_cours_d_examen_ne_compte_pas(admin_client, container):
    _certificate(container, EMP_A.id, "MASTER", "FINANCE", status=CertificateStatus.IN_REVIEW)
    body = admin_client.post(AUDIENCE, json={"unit_codes": ["PV"], "domains": ["FINANCE"]}).json()
    assert body["visible"] == 0


def test_ca05_personne_ne_verrait_le_poste(admin_client, certificates):
    assert admin_client.post(AUDIENCE, json={"domains": ["AGRONOMIE"]}).json()["visible"] == 0


def test_l_apercu_refuse_une_unite_inconnue(admin_client):
    response = admin_client.post(AUDIENCE, json={"unit_codes": ["INCONNUE"]})
    assert response.status_code == 422
    assert response.json()["error"]["field"] == "criteria_unit_codes"


# --- CA-01 à CA-03 : un poste pour plusieurs unités et plusieurs domaines --------------------


def test_ca01_ca02_le_poste_garde_ses_unites_et_ses_domaines(admin_client):
    created = admin_client.post(
        OPENINGS, json={**FICHE, "criteria": {"unit_codes": ["PV", "DM"], "domains": ["FINANCE", "COMPTABILITE"]}}
    )
    assert created.status_code == 201, created.text
    opening = admin_client.get(f"{OPENINGS}/{created.json()['id']}").json()
    assert opening["criteria"]["unit_codes"] == ["PV", "DM"]
    assert opening["criteria"]["domains"] == ["COMPTABILITE", "FINANCE"]
    assert opening["criteria_lines"] == ["Domaines : Comptabilité ou Finance", "Unités : Pétion-Ville, Delmas"]


def test_ca03_seuls_les_employes_qui_remplissent_tout_voient_le_poste(admin_client, employee_client, container):
    _certificate(container, EMP_A.id, "LICENCE", "FINANCE")  # Pétion-Ville, Finance : voit
    _certificate(container, EMP_E.id, "LICENCE", "GESTION")  # Pétion-Ville, Gestion : ne voit pas
    _certificate(container, EMP_H1.id, "LICENCE", "COMPTABILITE")  # Agence Démo : ne voit pas
    created = admin_client.post(
        OPENINGS, json={**FICHE, "criteria": {"unit_codes": ["PV", "DM"], "domains": ["COMPTABILITE", "FINANCE"]}}
    ).json()
    assert admin_client.post(f"{OPENINGS}/{created['id']}/publish").status_code == 200

    def codes(employee):
        return [item["code"] for item in employee_client(employee).get("/api/me/openings").json()["items"]]

    assert codes(EMP_A) == ["CC-2026-04"]
    assert codes(EMP_E) == []
    assert codes(EMP_H1) == []
    assert codes(EMP_B) == []


def test_ca03_les_postes_deja_enregistres_gardent_leur_unite_et_leur_domaine(tmp_path: Path):
    url = f"sqlite:///{(tmp_path / 'portail.db').as_posix()}"
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "0015")
    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO job_opening (id, code, title, unit_code, target_grade, mission, opens_on, closes_on, status,"
                " domain, criteria_unit_code) VALUES (1, 'ANCIEN', 'Ancien poste', 'PV', '12', 'M.', '2026-10-01',"
                " '2026-11-15', 'PUBLISHED', 'FINANCE', 'M1')"
            )
        )
    command.upgrade(config, "head")
    with engine.connect() as connection:
        domains = connection.execute(text("SELECT opening_id, domain FROM job_opening_domain")).all()
        units = connection.execute(text("SELECT opening_id, unit_code FROM job_opening_unit")).all()
    engine.dispose()
    assert [tuple(row) for row in domains] == [(1, "FINANCE")]
    assert [tuple(row) for row in units] == [(1, "M1")]
