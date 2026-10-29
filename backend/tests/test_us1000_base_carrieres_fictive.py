"""US-1000 — Base Carrières fictive (lot 5, PAM).

Les tables attendues reprennent le *Dictionnaire de données — Carrières* v1.0 (2026-10-27), §3 à §14.
Chaque test part d'une base vide : SQLite toujours, PostgreSQL en plus si `TEST_POSTGRES_URL` est défini.
"""

import hashlib
import sys

import pytest
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect, select, text

import app.container  # noqa: F401  (charge toutes les tables du portail dans Base.metadata)
from app.carrieres.infrastructure.tables import CARRIERES_TABLES, carrieres_metadata, include_in_migrations
from app.shared.infrastructure.database import Base
from app.tools import create_fake_carrieres
from app.tools.create_fake_carrieres import CreationRefused, create
from tests.conftest import POSTGRES_URL, _empty_postgres
from tests.employees import EMP_A, EMP_B, EMP_D1, EMP_D2, EMP_E, EMP_H1, EMP_H2, EMP_I

TEST_CODES = {e.employee_code for e in (EMP_A, EMP_H1, EMP_H2, EMP_D1, EMP_D2, EMP_I, EMP_E, EMP_B)}

# Dictionnaire v1.0 : colonnes de chaque table, et celles qui admettent NULL (« F »).
EXPECTED = {
    "employes": (
        "id code_employe nom prenom date_embauche date_sortie direction agence poste filiere code_superieur "
        "courriel actif origine quote_ressource cree_le modifie_le",
        "date_sortie code_superieur quote_ressource",
    ),
    "documents": (
        "id employe_id type_document titre date_document date_imputation imputeur_code imputeur_nom "
        "empreinte_sha256 taille_octets nombre_pages gravite gravite_derogation quote_document statut version "
        "est_actif chemin_stockage motif_suppression alignement categorie poste_vise lieu",
        "gravite quote_document",
    ),
    "fichiers_document": ("id document_id type_mime contenu", ""),
    "documents_competences": ("document_id competence_id", ""),
    "competences_dictionnaire": (
        "id libelle code famille sous_famille type_competence definition verbe_action methodes_evaluation "
        "competences_liees freq_reeval_mois statut_fiche version_fiche proprietaire indicateurs niveaux",
        "",
    ),
    "competences_postes": ("id competence_id code intitule", ""),
    "competences_pieces": ("id competence_id type_document intitule", ""),
    "vault_actifs": ("code_employe", ""),
    "etat_vault": ("id etag source nombre_actifs synchronise_le message", "synchronise_le"),
    "journal_audit": (
        "id horodatage acteur_courriel acteur_role action cible_type cible_id detail adresse_ip",
        "",
    ),
}


@pytest.fixture(params=["sqlite", "postgresql"])
def engine(request, tmp_path):
    if request.param == "sqlite":
        url = f"sqlite:///{(tmp_path / 'carrieres.db').as_posix()}"
    elif POSTGRES_URL:
        url = _empty_postgres(POSTGRES_URL)
    else:
        pytest.skip("TEST_POSTGRES_URL non défini")
    database_engine = create_engine(url)
    yield database_engine
    database_engine.dispose()


@pytest.fixture
def filled(engine):
    create(engine, app_env="local")
    return engine


def _rows(engine, sql: str, **params):
    with engine.connect() as connection:
        return connection.execute(text(sql), params).mappings().all()


# CA-01 — Une seule description des tables, conforme au dictionnaire


def test_ca01_les_tables_decrites_sont_celles_du_dictionnaire():
    assert set(CARRIERES_TABLES) == set(EXPECTED)
    for name, (columns, nullable) in EXPECTED.items():
        table = carrieres_metadata.tables[name]
        assert [c.name for c in table.columns] == columns.split(), name
        assert {c.name for c in table.columns if c.nullable} == set(nullable.split()), name


def test_ca01_la_base_creee_respecte_cles_et_unicites(filled):
    inspector = inspect(filled)
    assert set(CARRIERES_TABLES) <= set(inspector.get_table_names())

    def uniques(table):
        return {tuple(u["column_names"]) for u in inspector.get_unique_constraints(table)} | {
            tuple(i["column_names"]) for i in inspector.get_indexes(table) if i["unique"]
        }

    assert ("code_employe",) in uniques("employes")
    assert ("employe_id", "empreinte_sha256") in uniques("documents")
    assert ("document_id",) in uniques("fichiers_document")
    assert ("libelle",) in uniques("competences_dictionnaire")
    assert ("competence_id", "intitule") in uniques("competences_postes")
    assert ("competence_id", "type_document", "intitule") in uniques("competences_pieces")
    assert inspector.get_pk_constraint("documents_competences")["constrained_columns"] == ["document_id", "competence_id"]
    assert inspector.get_pk_constraint("vault_actifs")["constrained_columns"] == ["code_employe"]
    foreign = {(fk["constrained_columns"][0], fk["referred_table"]) for fk in inspector.get_foreign_keys("documents")}
    assert ("employe_id", "employes") in foreign


def test_ca01_types_et_longueurs_principaux():
    employes = carrieres_metadata.tables["employes"].c
    documents = carrieres_metadata.tables["documents"].c
    assert employes.code_employe.type.length == 32
    assert employes.courriel.type.length == 180
    assert (employes.quote_ressource.type.precision, employes.quote_ressource.type.scale) == (14, 6)
    assert documents.empreinte_sha256.type.length == 64
    assert documents.titre.type.length == 300
    assert carrieres_metadata.tables["fichiers_document"].c.contenu.type.python_type is bytes


# CA-02 — La commande crée et remplit une base qui n'a aucune table de Carrières


def test_ca02_la_commande_cree_et_remplit(engine):
    counts = create(engine, app_env="local")
    for table in ("employes", "documents", "fichiers_document", "vault_actifs", "etat_vault", "journal_audit"):
        assert counts[table] > 0, table
        assert _rows(engine, f"SELECT COUNT(*) AS n FROM {table}")[0]["n"] == counts[table]


def test_ca02_la_commande_lit_l_adresse_passee(tmp_path, monkeypatch, capsys):
    url = f"sqlite:///{(tmp_path / 'outil.db').as_posix()}"
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("ACME_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setattr(sys, "argv", ["create_fake_carrieres", "--database-url", url])
    create_fake_carrieres.main()
    assert "employes" in capsys.readouterr().out
    engine = create_engine(url)
    assert _rows(engine, "SELECT COUNT(*) AS n FROM employes")[0]["n"] == 8
    engine.dispose()


# CA-03 — Refus en production et sur une base qui a déjà une table de Carrières


def test_ca03_refus_en_production(engine):
    with pytest.raises(CreationRefused, match="production"):
        create(engine, app_env="production")
    assert not set(CARRIERES_TABLES) & set(inspect(engine).get_table_names())


def test_ca03_refus_si_une_table_de_carrieres_existe(engine):
    carrieres_metadata.tables["vault_actifs"].create(engine)
    with pytest.raises(CreationRefused, match="vault_actifs"):
        create(engine, app_env="local")
    assert set(CARRIERES_TABLES) & set(inspect(engine).get_table_names()) == {"vault_actifs"}


def test_ca03_la_commande_refuse_en_production_sans_rien_creer(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'prod.db').as_posix()}"
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setattr(sys, "argv", ["create_fake_carrieres", "--database-url", url])
    with pytest.raises(SystemExit, match="production"):
        create_fake_carrieres.main()


# CA-04 — Les données couvrent les cas dont PAM a besoin


def test_ca04_employes_actifs_sorti_et_superieur(filled):
    employees = {r["code_employe"]: r for r in _rows(filled, "SELECT * FROM employes")}
    sortis = [r for r in employees.values() if not r["actif"]]
    assert len(sortis) == 1 and sortis[0]["date_sortie"] is not None
    assert all(r["date_sortie"] is None for r in employees.values() if r["actif"])
    superieurs = {r["code_superieur"] for r in employees.values() if r["code_superieur"]}
    assert superieurs and superieurs <= set(employees)
    assert all(r["origine"] == "vault" for r in employees.values())


def test_ca04_pieces_dans_les_quatre_statuts(filled):
    statuts = {r["statut"] for r in _rows(filled, "SELECT statut FROM documents")}
    assert statuts == {"a_completer", "en_attente", "valide", "refuse"}
    for piece in _rows(filled, "SELECT * FROM documents"):
        if piece["statut"] == "a_completer":
            assert piece["type_document"] == ""
        if piece["statut"] == "refuse":
            assert not piece["est_actif"] and piece["motif_suppression"]


def test_ca04_formations_et_lettres(filled):
    pieces = _rows(filled, "SELECT * FROM documents WHERE statut <> 'a_completer'")
    alignements = {p["alignement"] for p in pieces if p["type_document"] in create_fake_carrieres.FORMATIONS}
    assert alignements == {"acme", "hors"}
    types = {p["type_document"] for p in pieces}
    assert {"lettre_promotion", "lettre_affectation", "lettre_blame"} <= types
    for piece in pieces:
        if piece["type_document"] == "lettre_promotion":
            assert piece["poste_vise"]
        if piece["type_document"] == "lettre_affectation":
            assert piece["lieu"]
        if piece["type_document"] == "lettre_blame":
            assert piece["gravite"] in {"legere", "moyenne", "grave"}
        if piece["type_document"] in create_fake_carrieres.FORMATIONS:
            assert piece["categorie"]


def test_ca04_quote_nulle_sans_piece_validee(filled):
    employees = _rows(filled, "SELECT id, quote_ressource FROM employes")
    valides = {r["employe_id"] for r in _rows(filled, "SELECT employe_id FROM documents WHERE statut = 'valide'")}
    sans_piece = [e for e in employees if e["id"] not in valides]
    assert sans_piece and all(e["quote_ressource"] is None for e in sans_piece)


def test_ca04_scans_aux_signatures_reelles(filled):
    files = _rows(filled, "SELECT f.type_mime, f.contenu, d.taille_octets, d.empreinte_sha256, d.chemin_stockage "
                          "FROM fichiers_document f JOIN documents d ON d.id = f.document_id")
    assert {f["type_mime"] for f in files} == {"application/pdf", "image/jpeg", "image/png"}
    for f in files:
        content = bytes(f["contenu"])
        if f["type_mime"] == "application/pdf":
            assert b"%PDF" in content[:1024]
        elif f["type_mime"] == "image/jpeg":
            assert content.startswith(b"\xff\xd8\xff")
        else:
            assert content.startswith(b"\x89PNG\r\n\x1a\n")
        assert f["taille_octets"] == len(content) and f["chemin_stockage"] == "base"
        assert f["empreinte_sha256"] == hashlib.sha256(content).hexdigest()


def test_ca04_vault_actifs_et_etat_vault(filled):
    actifs = {r["code_employe"] for r in _rows(filled, "SELECT code_employe FROM employes WHERE actif = :a", a=True)}
    assert {r["code_employe"] for r in _rows(filled, "SELECT code_employe FROM vault_actifs")} == actifs
    etat = _rows(filled, "SELECT * FROM etat_vault")
    assert len(etat) == 1 and etat[0]["id"] == 1
    assert etat[0]["nombre_actifs"] == len(actifs) and etat[0]["synchronise_le"] is not None


# CA-05 — Les codes des employés fictifs de la suite, aucune donnée réelle


def test_ca05_codes_des_employes_fictifs(filled):
    codes = {r["code_employe"] for r in _rows(filled, "SELECT code_employe FROM employes")}
    assert codes == TEST_CODES
    assert all(code == code.upper() and " " not in code for code in codes)
    courriels = {r["courriel"] for r in _rows(filled, "SELECT courriel FROM employes")} - {""}
    assert all(c.endswith("@exemple.test") for c in courriels)


# CA-06 — Les migrations du portail ignorent les tables de Carrières


def test_ca06_alembic_ignore_les_tables_de_carrieres(filled):
    Base.metadata.create_all(filled)
    with filled.connect() as connection:
        sans_filtre = compare_metadata(MigrationContext.configure(connection), Base.metadata)
        avec_filtre = compare_metadata(
            MigrationContext.configure(connection, opts={"include_object": include_in_migrations}), Base.metadata
        )
    retirees = {diff[1].name for diff in sans_filtre if diff[0] == "remove_table"}
    assert set(CARRIERES_TABLES) <= retirees  # sans le filtre, Alembic les supprimerait
    assert not [d for d in avec_filtre if set(CARRIERES_TABLES) & {getattr(x, "name", None) for x in d[1:]}]


def test_ca06_les_migrations_du_portail_utilisent_le_filtre():
    source = (create_fake_carrieres.BACKEND_DIR / "migrations" / "env.py").read_text(encoding="utf-8")
    assert source.count("include_object=include_in_migrations") == 2


def test_aucune_table_du_portail_ne_porte_un_nom_de_carrieres():
    assert not set(CARRIERES_TABLES) & set(Base.metadata.tables)


def test_les_lectures_par_le_code_restent_possibles(filled):
    employes = carrieres_metadata.tables["employes"]
    with filled.connect() as connection:
        row = connection.execute(select(employes.c.nom).where(employes.c.code_employe == EMP_A.employee_code)).one()
    assert row.nom == EMP_A.last_name
