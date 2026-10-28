"""Tables de Carrières que PAM lit ou écrit (US-1000).

Source : *Dictionnaire de données — Carrières* v1.0 (2026-10-27), §3 à §14. Ces tables appartiennent à
Carrières : PAM ne les crée jamais en production et ses migrations Alembic les ignorent
(`include_in_migrations`). Seule la base fictive (`app.tools.create_fake_carrieres`) les crée.
Les comptes DRH (`utilisateurs`, `profils_utilisateur`, `defis_otp`) ne concernent pas PAM.
"""

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
)

carrieres_metadata = MetaData()


def _text(name: str, length: int | None = None, **kwargs) -> Column:
    """Texte obligatoire, chaîne vide par défaut (« Défaut '' » du dictionnaire)."""
    kind = String(length) if length else Text()
    return Column(name, kind, nullable=False, server_default="", **kwargs)


def _timestamp(name: str, *, nullable: bool = False, **kwargs) -> Column:
    return Column(name, DateTime(timezone=True), nullable=nullable, **kwargs)


# §5
employes = Table(
    "employes",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    Column("code_employe", String(32), nullable=False, unique=True, index=True),
    Column("nom", String(120), nullable=False, index=True),
    Column("prenom", String(120), nullable=False),
    Column("date_embauche", Date, nullable=False),
    Column("date_sortie", Date, nullable=True),
    _text("direction", 120, index=True),
    _text("agence", 120, index=True),
    _text("poste", 120),
    _text("filiere", 120),
    Column("code_superieur", String(32), nullable=True, index=True),
    _text("courriel", 180),
    Column("actif", Boolean, nullable=False, server_default="true"),
    Column("origine", String(16), nullable=False, server_default="saisie"),
    Column("quote_ressource", Numeric(14, 6), nullable=True),
    _timestamp("cree_le"),
    _timestamp("modifie_le"),
)

# §6
documents = Table(
    "documents",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    Column("employe_id", Integer, ForeignKey("employes.id"), nullable=False, index=True),
    Column("type_document", String(64), nullable=False),
    Column("titre", String(300), nullable=False),
    Column("date_document", Date, nullable=False),
    _timestamp("date_imputation"),
    Column("imputeur_code", String(32), nullable=False),
    Column("imputeur_nom", String(180), nullable=False),
    Column("empreinte_sha256", String(64), nullable=False),
    Column("taille_octets", Integer, nullable=False),
    Column("nombre_pages", Integer, nullable=False, server_default="0"),
    Column("gravite", String(16), nullable=True),
    Column("gravite_derogation", Boolean, nullable=False, server_default="false"),
    Column("quote_document", Numeric(14, 6), nullable=True),
    Column("statut", String(32), nullable=False, index=True),
    Column("version", Integer, nullable=False, server_default="1"),
    Column("est_actif", Boolean, nullable=False, server_default="true"),
    Column("chemin_stockage", String(500), nullable=False),
    Column("motif_suppression", String(500), nullable=False),
    Column("alignement", String(24), nullable=False),
    Column("categorie", String(64), nullable=False),
    Column("poste_vise", String(120), nullable=False),
    Column("lieu", String(120), nullable=False),
    UniqueConstraint("employe_id", "empreinte_sha256", name="uq_empreinte_employe"),
)

# §7
fichiers_document = Table(
    "fichiers_document",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True),
    Column("type_mime", String(80), nullable=False),
    Column("contenu", LargeBinary, nullable=False),
)

# §9
competences_dictionnaire = Table(
    "competences_dictionnaire",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    Column("libelle", String(300), nullable=False, unique=True),
    _text("code", 32),
    _text("famille", 80),
    _text("sous_famille", 80),
    _text("type_competence", 40),
    _text("definition"),
    _text("verbe_action", 300),
    _text("methodes_evaluation"),
    _text("competences_liees", 300),
    Column("freq_reeval_mois", Integer, nullable=False, server_default="12"),
    _text("statut_fiche", 32),
    _text("version_fiche", 16),
    _text("proprietaire", 120),
    _text("indicateurs"),
    _text("niveaux"),
)

# §8
documents_competences = Table(
    "documents_competences",
    carrieres_metadata,
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("competence_id", Integer, ForeignKey("competences_dictionnaire.id", ondelete="CASCADE"), primary_key=True),
)

# §11
competences_postes = Table(
    "competences_postes",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "competence_id", Integer, ForeignKey("competences_dictionnaire.id", ondelete="CASCADE"), nullable=False, index=True
    ),
    _text("code", 32),
    Column("intitule", String(180), nullable=False),
    UniqueConstraint("competence_id", "intitule", name="uq_competence_poste"),
)

# §12
competences_pieces = Table(
    "competences_pieces",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    Column("competence_id", Integer, ForeignKey("competences_dictionnaire.id"), nullable=False, index=True),
    Column("type_document", String(64), nullable=False),
    _text("intitule", 300),
    UniqueConstraint("competence_id", "type_document", "intitule", name="uq_competence_piece"),
)

# §13
vault_actifs = Table(
    "vault_actifs",
    carrieres_metadata,
    Column("code_employe", String(32), primary_key=True),
)

etat_vault = Table(
    "etat_vault",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    _text("etag", 128),
    _text("source", 300),
    Column("nombre_actifs", Integer, nullable=False, server_default="0"),
    _timestamp("synchronise_le", nullable=True),
    _text("message", 500),
)

journal_audit = Table(
    "journal_audit",
    carrieres_metadata,
    Column("id", Integer, primary_key=True),
    _timestamp("horodatage", index=True),
    Column("acteur_courriel", String(180), nullable=False),
    Column("acteur_role", String(32), nullable=False),
    Column("action", String(64), nullable=False),
    Column("cible_type", String(64), nullable=False),
    _text("cible_id", 64),
    Column("detail", Text, nullable=False, server_default="{}"),
    _text("adresse_ip", 64),
)

CARRIERES_TABLES = tuple(carrieres_metadata.tables)
"""Noms des tables de Carrières reproduites ici."""


def include_in_migrations(obj, name, type_, reflected, compare_to) -> bool:
    """Filtre Alembic : les migrations du portail ne créent, ne modifient ni ne suppriment une table de Carrières."""
    if type_ == "table":
        return name not in CARRIERES_TABLES
    table = getattr(obj, "table", None)
    return table is None or table.name not in CARRIERES_TABLES
