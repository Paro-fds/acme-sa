"""US-501 — Tenir le référentiel officiel (import Excel au lot 1)."""

from datetime import UTC, datetime

import pytest

from app.config import DEMO_REFERENTIAL
from tests.fake_clock import FakeClock
from tests.referential import MAPPINGS, UNITS, workbook

IMPORT = "/api/admin/referential/import"
REFERENTIAL = "/api/admin/referential"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def upload(client, content: bytes, name: str = "referentiel.xlsx"):
    return client.post(IMPORT, files={"file": (name, content, XLSX)})


def units_by_code(client) -> dict:
    return {unit["code"]: unit for unit in client.get(REFERENTIAL).json()["units"]}


def replace(rows, code, **changes):
    columns = ["code", "label", "type", "parent", "since", "former"]
    out = []
    for row in rows:
        row = list(row)
        if row[0] == code:
            for key, value in changes.items():
                row[columns.index(key)] = value
        out.append(row)
    return out


@pytest.fixture
def clock(container) -> FakeClock:
    fake = FakeClock(datetime(2026, 10, 8, 9, 0, tzinfo=UTC))
    container.clock = fake
    return fake


# --- CA-01 : import du fichier Excel par un administrateur -----------------------------------


def test_ca01_import_d_un_fichier_coherent(admin_client, clock):
    response = upload(admin_client, workbook())

    assert response.status_code == 200
    assert response.json() == {
        "counts": {"Agence": 3, "Région": 2, "Direction": 2, "Service": 1},
        "added": 8,
        "renamed": [],
        "moved": [],
        "mappings": 7,
        "unmapped": 1,
    }
    pv = units_by_code(admin_client)["PV"]
    assert (pv["label"], pv["type_label"], pv["parent_code"], pv["parent_label"], pv["since"]) == (
        "Pétion-Ville",
        "Agence",
        "M1",
        "Métropole 1",
        "2026-01-01",
    )
    mappings = admin_client.get(REFERENTIAL).json()["mappings"]
    assert {"column": "agency_code", "value": "PB", "unit_code": None} in mappings


@pytest.mark.parametrize(
    ("units", "mappings", "expected"),
    [
        (UNITS + [["PV", "Doublon", "Agence", "M1", "", ""]], MAPPINGS, "Code en double : PV (déjà à la ligne 4)."),
        (replace(UNITS, "DM", parent=""), MAPPINGS, "Agence sans région : DM."),
        (replace(UNITS, "DM", parent="XX"), MAPPINGS, "DM est rattachée à « XX », absent du fichier."),
        (replace(UNITS, "DM", parent="DOP"), MAPPINGS, "Agence DM : rattachement attendu à une région."),
        (replace(UNITS, "DM", type="Succursale"), MAPPINGS, "Type « Succursale » inconnu pour DM"),
        (replace(UNITS, "DM", label=""), MAPPINGS, "Libellé officiel manquant pour DM."),
        (UNITS, MAPPINGS + [["agency_code", "PV", "PV"]], "Valeur « PV » en double"),
        (UNITS, MAPPINGS + [["agency_code", "LS", "LS"]], "Unité « LS » absente de l'onglet Unités."),
        (UNITS, MAPPINGS + [["position", "Caissier", ""]], "Colonne de l'export « position » inconnue"),
    ],
    ids=["code-en-double", "agence-sans-region", "rattachement-inconnu", "agence-sous-direction", "type-inconnu",
         "libelle-vide", "correspondance-en-double", "correspondance-vers-unite-inconnue", "colonne-inconnue"],
)
def test_ca01_un_fichier_incoherent_est_refuse_en_entier(admin_client, clock, units, mappings, expected):
    response = upload(admin_client, workbook(units, mappings))

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "REFERENTIAL_REJECTED"
    assert any(expected in problem["message"] for problem in error["problems"]), error["problems"]
    assert {key: value for key, value in admin_client.get(REFERENTIAL).json().items() if key != "to_attach"} == {"units": [], "mappings": []}


def test_ca01_chaque_probleme_donne_son_onglet_et_sa_ligne(admin_client, clock):
    response = upload(admin_client, workbook(replace(UNITS, "DM", parent="")))

    assert {"sheet": "Unités", "line": 6, "message": "Agence sans région : DM."} in response.json()["error"]["problems"]


@pytest.mark.parametrize(
    ("content", "message"),
    [
        (b"Code;Libelle\nPV;Petion-Ville\n", "n'est pas un classeur Excel"),
        (workbook(unit_header=["Code", "Libellé officiel", "Type"]), "Colonne « Rattachée à » introuvable"),
        (workbook(units=replace(UNITS, "PV", since="2026-13-45")), "Date « 2026-13-45 » illisible"),
    ],
    ids=["pas-excel", "colonne-manquante", "date-illisible"],
)
def test_ca01_un_fichier_illisible_est_refuse_avec_une_explication(admin_client, clock, content, message):
    response = upload(admin_client, content)

    assert response.status_code == 422
    assert message in response.json()["error"]["message"]


def test_ca01_seul_un_administrateur_importe(client, employee_client):
    from tests.employees import EMP_A

    assert upload(client, workbook()).status_code == 401
    assert upload(employee_client(EMP_A), workbook()).status_code == 403


def test_ca01_les_en_tetes_sont_reconnus_sans_tenir_compte_des_accents_ni_des_majuscules(admin_client, clock):
    header = ["CODE", "libelle officiel", "type", "rattachee a", "rattachee depuis", "anciens libelles"]

    assert upload(admin_client, workbook(unit_header=header)).status_code == 200


# --- CA-02 : code stable, renommage avec ancien libellé ----------------------------------------


def test_ca02_un_renommage_garde_le_code_et_l_ancien_libelle(admin_client, clock):
    upload(admin_client, workbook())

    response = upload(admin_client, workbook(replace(UNITS, "PV", label="Agence de Pétion-Ville")))

    assert response.json()["renamed"] == ["PV : Pétion-Ville → Agence de Pétion-Ville"]
    assert response.json()["added"] == 0
    pv = units_by_code(admin_client)["PV"]
    assert (pv["code"], pv["label"], pv["former_labels"]) == ("PV", "Agence de Pétion-Ville", ["Pétion-Ville"])


def test_ca02_les_anciens_libelles_du_fichier_sont_gardes(admin_client, clock):
    upload(admin_client, workbook(replace(UNITS, "AD", former="Succursale Démo ; Bureau Démo")))

    assert units_by_code(admin_client)["AD"]["former_labels"] == ["Succursale Démo", "Bureau Démo"]


def test_ca02_une_unite_absente_du_nouveau_fichier_n_est_pas_supprimee(admin_client, clock):
    upload(admin_client, workbook())

    upload(admin_client, workbook([row for row in UNITS if row[0] != "DM"], [m for m in MAPPINGS if m[2] != "DM"]))

    assert "DM" in units_by_code(admin_client)


# --- CA-03 : une seule région à la fois, avec dates -------------------------------------------


def test_ca03_changer_de_region_ferme_l_ancien_rattachement(admin_client, clock):
    upload(admin_client, workbook())

    response = upload(admin_client, workbook(replace(UNITS, "DM", parent="GS2", since="01/11/2026")))

    assert response.json()["moved"] == ["DM : Métropole 1 → Grand Sud 2 (depuis le 01/11/2026)"]
    dm = units_by_code(admin_client)["DM"]
    assert (dm["parent_code"], dm["since"]) == ("GS2", "2026-11-01")
    assert dm["history"] == [
        {"parent_code": "M1", "start": "2026-01-01", "end": "2026-11-01"},
        {"parent_code": "GS2", "start": "2026-11-01", "end": None},
    ]


def test_ca03_sans_date_le_rattachement_commence_le_jour_de_l_import(admin_client, clock):
    upload(admin_client, workbook(replace(UNITS, "PV", since="")))

    assert units_by_code(admin_client)["PV"]["since"] == "2026-10-08"


def test_ca03_reimporter_le_meme_fichier_ne_change_rien(admin_client, clock):
    upload(admin_client, workbook())

    response = upload(admin_client, workbook())

    assert (response.json()["added"], response.json()["renamed"], response.json()["moved"]) == (0, [], [])
    assert len(units_by_code(admin_client)["PV"]["history"]) == 1


# --- Démonstrateur : référentiel fictif --------------------------------------------------------


def test_le_referentiel_fictif_du_demonstrateur_s_importe_sans_erreur(admin_client, clock):
    response = upload(admin_client, DEMO_REFERENTIAL.read_bytes(), DEMO_REFERENTIAL.name)

    assert response.status_code == 200, response.json()
    assert response.json()["unmapped"] >= 1  # PB et RC restent « À rattacher », comme dans l'export réel
