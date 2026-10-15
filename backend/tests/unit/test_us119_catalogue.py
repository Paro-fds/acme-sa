"""US-119 — Catalogue des postes ACME : règles des fiches et import des descriptions de poste.

- Le niveau demandé par la fiche se résume (« Bac + 4 ») et suggère un niveau de l'échelle (CA-01, CA-03).
- Le domaine de la fiche propose des domaines de diplôme (proposition à valider par la DRH, CA-03).
- L'import ramène les deux modèles de fiche à un seul jeu de rubriques (CA-02).
"""

from pathlib import Path

import pytest

from app.certificate.domain.certificate import DOMAIN_LABELS
from app.job.domain.catalogue import DIPLOMA_DOMAINS, SECTION_TITLES, describe_level, diploma_domains, suggest_level
from app.tools.import_job_profiles import build_catalogue

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "postes"


@pytest.mark.parametrize(
    ("lines", "expected"),
    [
        (["Diplôme Bac + 4 ou BAC + 5 (Dépendant de la spécialisation)", "Maîtrise de l'outil informatique"], "Bac + 4 ou Bac + 5"),
        (["BAC + 5 minimum, idéalement en gestion, finance ou domaine connexe"], "Bac + 5"),
        (["BAC + 4"], "Bac + 4"),
        (["Diplôme Bac I ou Bac II"], "Baccalauréat"),
        (["BAC"], "Baccalauréat"),
        (["Licence en sciences comptables"], "Licence"),
        (["Master en finance ou équivalent"], "Master"),
        (["Diplôme universitaire de premier cycle"], "Licence"),
        (["Diplôme universitaire en gestion, finance ou domaine connexe"], "Diplôme universitaire"),
        (["Diplôme d'études supérieures en informatique"], "Études supérieures"),
        (["Maîtriser les notions de base de comptabilité", "Capacité d'analyse"], None),
        ([], None),
    ],
)
def test_ca01_le_niveau_demande_se_resume(lines, expected):
    assert describe_level(lines) == expected


@pytest.mark.parametrize(
    ("level_text", "expected"),
    [
        ("Bac + 4", "LICENCE"),
        ("Bac + 3", "LICENCE"),
        ("Bac + 4 ou Bac + 5", "LICENCE"),
        ("Bac + 5", "MASTER"),
        ("Bac + 2", "BAC_PLUS_2"),
        ("Baccalauréat", "BACCALAUREAT"),
        ("Licence", "LICENCE"),
        ("Master", "MASTER"),
        ("Diplôme universitaire", "LICENCE"),
        ("Études supérieures", None),
        (None, None),
    ],
)
def test_ca03_le_niveau_de_la_fiche_suggere_un_niveau_de_l_echelle(level_text, expected):
    assert suggest_level(level_text) == expected


def test_ca03_le_domaine_de_la_fiche_propose_des_domaines_de_diplome():
    assert diploma_domains("Comptabilité") == ("COMPTABILITE", "FINANCE")
    assert diploma_domains("Informatique") == ("INFORMATIQUE",)
    assert diploma_domains("Management") == ()
    assert diploma_domains("Domaine inconnu") == ()
    assert diploma_domains(None) == ()


def test_ca03_les_domaines_proposes_existent_dans_la_liste_des_diplomes():
    for codes in DIPLOMA_DOMAINS.values():
        assert all(code in DOMAIN_LABELS for code in codes)


def _profiles():
    return {profile["code"]: profile for profile in build_catalogue(FIXTURES / "postes", FIXTURES / "postes_et_domaines.md")["profiles"]}


def test_ca02_l_import_lit_chaque_fiche_une_seule_fois():
    # « caissier-fictif-html.html » double « caissier-fictif.html » ; « gardien-fictif-html.html » est la seule version.
    assert sorted(_profiles()) == ["agent-fictif-credit", "caissier-fictif", "gardien-fictif"]


def test_ca02_le_titre_et_le_domaine_viennent_du_tableau_sans_tenir_compte_des_accents():
    profile = _profiles()["agent-fictif-credit"]
    assert profile["title"] == "Agent fictif de Crédit"
    assert profile["domain"] == "Banque et microfinance"
    # Le titre de la page diffère du tableau par des mots de liaison et des pluriels : la fiche est reconnue.
    assert _profiles()["caissier-fictif"]["domain"] == "Finance"
    unknown = _profiles()["gardien-fictif"]
    assert unknown["title"] == "Gardien Fictif"
    assert unknown["domain"] is None


def test_ca02_les_deux_modeles_de_fiche_donnent_les_memes_rubriques():
    for profile in _profiles().values():
        assert all(section["title"] in SECTION_TITLES for section in profile["sections"])
        assert all(section["lines"] for section in profile["sections"])
    agent = {s["title"]: s["lines"] for s in _profiles()["agent-fictif-credit"]["sections"]}
    caissier = {s["title"]: s["lines"] for s in _profiles()["caissier-fictif"]["sections"]}
    assert agent["Missions"] == ["Rechercher de nouveaux clients fictifs", "Constituer les dossiers de prêts"]
    assert caissier["Missions"] == ["Encaisser les versements", "Fermer la caisse chaque jour"]
    assert caissier["Qualifications"] == ["Diplôme Bac I ou Bac II"]
    assert caissier["Expérience"] == ["Aucune expérience antérieure en caisse n'est exigée."]
    assert caissier["Conditions d'exercice"] == ["Ce travail est effectué en interne."]
    assert caissier["Qualités attendues"] == ["Être rigoureux"]


def test_ca02_le_paragraphe_de_conclusion_rejoint_la_description():
    agent = _profiles()["agent-fictif-credit"]
    assert agent["description"].startswith("L'agent fictif de crédit suit un portefeuille")
    assert "excellente occasion" in agent["description"]
    conditions = {s["title"]: s["lines"] for s in agent["sections"]}["Conditions d'exercice"]
    assert conditions == ["Travail sur le terrain et au bureau"]


def test_ca01_le_niveau_est_tire_des_qualifications():
    profiles = _profiles()
    assert profiles["agent-fictif-credit"]["level_text"] == "Bac + 4 ou Bac + 5"
    assert profiles["caissier-fictif"]["level_text"] == "Baccalauréat"
    assert profiles["gardien-fictif"]["level_text"] is None


def test_ca02_le_lien_retour_n_entre_pas_dans_la_fiche():
    for profile in _profiles().values():
        text = profile["description"] + " ".join(line for s in profile["sections"] for line in s["lines"])
        assert "Retour à l'accueil" not in text
