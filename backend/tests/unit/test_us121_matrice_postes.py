"""US-121 — Le catalogue des postes vient de la matrice des postes du directeur (base SQLite fictive des tests).

- CA-01 : chaque poste de la matrice, avec son code (vide s'il n'en a pas), son département, son service, ses compétences.
- CA-02 : le département propose des domaines de diplôme (proposition à valider par la DRH).
- CA-03 : une description de poste de même intitulé complète le poste (rubriques, niveau demandé).
- CA-06 : une description sans poste dans la matrice n'est plus proposée.
"""

import sqlite3
from pathlib import Path

import pytest

from app.certificate.domain.certificate import DOMAIN_LABELS
from app.job.domain.catalogue import DIPLOMA_DOMAINS, diploma_domains
from app.tools.import_job_profiles import build_catalogue

FICHES = Path(__file__).resolve().parent.parent / "fixtures" / "postes" / "postes"

# Schéma de la base du directeur (meta, poste, competence_poste), avec des postes fictifs.
SCHEMA = """
CREATE TABLE meta (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL);
CREATE TABLE poste (
    id INTEGER PRIMARY KEY, identifiant TEXT NOT NULL UNIQUE, code TEXT NOT NULL DEFAULT '', intitule TEXT NOT NULL,
    departement TEXT NOT NULL DEFAULT '', service TEXT NOT NULL DEFAULT '', rattachement TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE competence_poste (
    id INTEGER PRIMARY KEY, poste_id INTEGER NOT NULL REFERENCES poste (id) ON DELETE CASCADE,
    libelle TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT ''
);
"""
POSTES = [
    (1, "c:AF01", "AF01", "Agent fictif de crédit", "Crédit", "Réseau d'agences fictif"),
    (2, "c:CA02", "CA02", "Caissiers fictifs de la caisse", "Opérations", "Caisse"),
    (3, "p:coordonnateur fictif", "", "Coordonnateur fictif", "Recouvrement", "Recouvrement de terrain"),
]
COMPETENCES = [
    (1, 1, "Suivi du portefeuille"),
    (2, 3, "Coordination des agents fictifs"),
    (3, 1, "Analyse des dossiers de prêt fictifs"),
    (4, 2, "Tenue de la caisse"),
]


@pytest.fixture
def matrix(tmp_path) -> Path:
    path = tmp_path / "matrice.sqlite"
    with sqlite3.connect(path) as db:
        db.executescript(SCHEMA)
        db.execute("INSERT INTO meta VALUES ('schema', '1')")
        db.executemany("INSERT INTO poste (id, identifiant, code, intitule, departement, service) VALUES (?, ?, ?, ?, ?, ?)", POSTES)
        db.executemany("INSERT INTO competence_poste (id, poste_id, libelle) VALUES (?, ?, ?)", COMPETENCES)
    return path


def _profiles(matrix, fiches=FICHES):
    return {profile["code"]: profile for profile in build_catalogue(matrix, fiches)["profiles"]}


def test_ca01_ca06_le_catalogue_reprend_les_postes_de_la_matrice_et_eux_seuls(matrix):
    # « Gardien Fictif » n'a pas de poste dans la matrice : il n'est plus proposé.
    assert sorted(_profiles(matrix)) == ["AF01", "CA02", "coordonnateur-fictif"]


def test_ca01_chaque_poste_a_son_code_son_departement_son_service_et_ses_competences(matrix):
    agent = _profiles(matrix)["AF01"]
    assert agent["position_code"] == "AF01"
    assert agent["title"] == "Agent fictif de crédit"
    assert agent["department"] == "Crédit"
    assert agent["service"] == "Réseau d'agences fictif"
    # Dans l'ordre de la base.
    assert agent["competences"] == ["Suivi du portefeuille", "Analyse des dossiers de prêt fictifs"]


def test_ca01_un_poste_sans_code_garde_un_code_vide_et_une_cle_tiree_de_l_intitule(matrix):
    coordinator = _profiles(matrix)["coordonnateur-fictif"]
    assert coordinator["position_code"] == ""
    assert coordinator["title"] == "Coordonnateur fictif"


def test_ca03_la_description_de_meme_intitule_complete_le_poste(matrix):
    profiles = _profiles(matrix)
    agent = profiles["AF01"]
    assert agent["level_text"] == "Bac + 4 ou Bac + 5"
    assert agent["description"].startswith("L'agent fictif de crédit suit un portefeuille")
    assert {s["title"]: s["lines"] for s in agent["sections"]}["Missions"] == [
        "Rechercher de nouveaux clients fictifs",
        "Constituer les dossiers de prêts",
    ]
    # Intitulé au pluriel et mots de liaison différents : la description est reconnue ; l'intitulé de la matrice fait foi.
    caissier = profiles["CA02"]
    assert caissier["title"] == "Caissiers fictifs de la caisse"
    assert caissier["level_text"] == "Baccalauréat"


def test_ca03_sans_description_le_niveau_n_est_pas_precise(matrix):
    coordinator = _profiles(matrix)["coordonnateur-fictif"]
    assert coordinator["level_text"] is None
    assert coordinator["sections"] == []
    assert coordinator["description"] == ""


def test_ca01_sans_dossier_de_descriptions_la_matrice_suffit(matrix, tmp_path):
    profiles = _profiles(matrix, tmp_path / "absent")
    assert sorted(profiles) == ["AF01", "CA02", "coordonnateur-fictif"]
    assert all(profile["sections"] == [] for profile in profiles.values())


def test_ca02_le_departement_propose_des_domaines_de_diplome():
    assert diploma_domains("Crédit") == ("BANQUE_MICROFINANCE", "FINANCE", "GESTION")
    assert diploma_domains("credit") == ("BANQUE_MICROFINANCE", "FINANCE", "GESTION")
    assert diploma_domains("Informatique") == ("INFORMATIQUE",)
    assert diploma_domains("Direction générale") == ()
    assert diploma_domains(None) == ()


def test_ca02_les_domaines_proposes_existent_dans_la_liste_des_diplomes():
    for codes in DIPLOMA_DOMAINS.values():
        assert codes and all(code in DOMAIN_LABELS for code in codes)
