"""US-203 — Confirmer ou signaler mon agence, mon poste, ma date d'embauche (EF-203, EF-204, EF-205 ; RG-03, RG-16 ; D-02)."""

from datetime import date

import pytest

from app.dossier.application.use_cases import GetMyDossier
from app.dossier.domain.hr_information import HrValues, ReportOrigin
from tests.employees import EMP_A, EMP_H1, SECRET_MARKER
from tests.referential import workbook

DOSSIER = "/api/me/dossier"
HR = "/api/me/dossier/hr-information"


def _item(dossier, key):
    return next(item for item in dossier["hr_information"] if item["key"] == key)


@pytest.fixture
def referential(container):
    container.import_referential().execute(workbook(), "referentiel.xlsx", "admin")


# --- CA-01 : jamais modifiables, affichés tels que le système RH les connaît --------------------------


def test_ca01_les_trois_informations_viennent_du_systeme_rh(employee_client, referential):
    dossier = employee_client(EMP_H1).get(DOSSIER).json()

    assert [(item["key"], item["label"], item["value"]) for item in dossier["hr_information"]] == [
        ("agency_confirmed", "Agence d'affectation", "Agence Démo"),
        ("position_confirmed", "Poste actuel", "Assistante administrative"),
        ("hire_date_confirmed", "Date d'embauche", "15/01/2015"),
    ]
    assert all(item["status"] == "TO_CONFIRM" for item in dossier["hr_information"])
    assert SECRET_MARKER not in str(dossier)


def test_ca01_aucune_route_ne_permet_de_les_modifier(employee_client):
    client = employee_client(EMP_A)

    assert client.put(f"{HR}/position_confirmed", json={"value": "Directeur"}).status_code in (404, 405)
    assert client.get("/api/me/profile").json()["position"] == "Agent de crédit"


# --- CA-02 : « Ces informations sont exactes » --------------------------------------------------


def test_ca02_confirmer_enregistre_la_date(employee_client, clock):
    client = employee_client(EMP_A)

    response = client.post(f"{HR}/position_confirmed/confirm")

    assert response.status_code == 200
    item = _item(response.json(), "position_confirmed")
    assert item["status"] == "CONFIRMED"
    assert item["answered_at"] == clock.now().isoformat().replace("+00:00", "Z")


def test_ca02_une_information_inconnue_est_refusee(employee_client):
    assert employee_client(EMP_A).post(f"{HR}/salary/confirm").status_code == 404


# --- CA-03 : « Signaler une erreur » -------------------------------------------------------------


def test_ca03_signaler_demande_la_bonne_information(employee_client):
    response = employee_client(EMP_A).post(f"{HR}/hire_date_confirmed/report", json={"correct_value": " ", "comment": ""})

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "correct_value"


def test_ca03_le_signalement_garde_la_date_l_ancienne_valeur_et_le_motif(employee_client, container, clock):
    client = employee_client(EMP_A)

    response = client.post(
        f"{HR}/hire_date_confirmed/report",
        json={"correct_value": "12/03/2017", "comment": "Contrat initial signé en mars 2017."},
    )

    assert response.status_code == 200
    assert _item(response.json(), "hire_date_confirmed")["status"] == "REPORTED"
    [report] = container.dossiers.reports(EMP_A.id)
    assert (report.information, report.origin, report.current_value, report.indicated_value, report.comment, report.at) == (
        "hire_date_confirmed",
        ReportOrigin.EMPLOYEE,
        "03/09/2018",
        "12/03/2017",
        "Contrat initial signé en mars 2017.",
        clock.now(),
    )


# --- CA-04 : confirmé ou signalé, le champ compte comme complet -----------------------------------


def test_ca04_confirme_ou_signale_compte_comme_complet(employee_client):
    client = employee_client(EMP_A)
    client.post(f"{HR}/agency_confirmed/confirm")
    client.post(f"{HR}/position_confirmed/report", json={"correct_value": "Chargé de crédit", "comment": ""})

    completion = client.get("/api/me/profile").json()["completion"]

    done = {element["key"] for element in completion["elements"] if element["complete"]}
    assert done == {"agency_confirmed", "position_confirmed"}
    assert completion["percent"] == 25


# --- CA-05 : embauche avant 18 ans → signalement automatique, sans bloquer ------------------------


class _Source:
    def __init__(self, values):
        self.values = values

    def execute(self, employee_id):
        return self.values


class _NoContact:
    def execute(self, employee_id):
        return {}


def test_ca05_embauche_avant_18_ans_cree_un_seul_signalement_automatique(container):
    suspect = HrValues(agency="Agence Démo", position="Caissière", hire_date=date(2010, 1, 4), birth_date=date(1995, 5, 5))
    get_dossier = GetMyDossier(container.dossiers, _NoContact(), _Source(suspect), container.clock)

    get_dossier.execute(EMP_A.id)
    view = get_dossier.execute(EMP_A.id)

    [report] = container.dossiers.reports(EMP_A.id)
    assert (report.information, report.origin, report.current_value) == (
        "hire_date_confirmed",
        ReportOrigin.AUTOMATIC,
        "04/01/2010",
    )
    hire = next(item for item in view.hr_information if item.key == "hire_date_confirmed")
    assert hire.status == "TO_CONFIRM"  # l'employé n'est pas bloqué : il confirme ou signale lui-même


def test_ca05_rien_pour_une_date_plausible(employee_client, container):
    employee_client(EMP_A).get(DOSSIER)

    assert container.dossiers.reports(EMP_A.id) == []
