"""Crée une base Carrières **fictive** pour développer et tester PAM (US-1000).

Usage (depuis backend/) :
    .venv\\Scripts\\python -m app.tools.create_fake_carrieres                       # base de DATABASE_URL
    .venv\\Scripts\\python -m app.tools.create_fake_carrieres --database-url <url>  # autre base

Refuse de s'exécuter avec APP_ENV=production, et sur une base qui contient déjà une table de Carrières :
la commande ne touche jamais à une vraie base. Les employés sont ceux de la suite de tests (AC-1001 → AC-1008).
"""

import hashlib
import json
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.engine import Connection, Engine

from app.carrieres.infrastructure.tables import (
    CARRIERES_TABLES,
    carrieres_metadata,
    competences_dictionnaire,
    competences_pieces,
    competences_postes,
    documents,
    documents_competences,
    employes,
    etat_vault,
    fichiers_document,
    journal_audit,
    vault_actifs,
)
from app.config import Settings, normalize_database_url

BACKEND_DIR = Path(__file__).resolve().parents[2]

NOW = datetime(2026, 10, 27, 6, 0, tzinfo=UTC)
"""Heure de la synchronisation fictive ; les quotes sont calculées à cette date."""

# Dictionnaire §14 : formations, poids de base (version YAML 1), points des blâmes, grille d'ancienneté (§16).
FORMATIONS = (
    "doctorat", "master", "licence", "baccalaureat", "diplome_technique", "diplome",
    "certificat", "attestation_generale", "attestation",
)
WEIGHTS = {
    "doctorat": 10, "master": 8, "licence": 6, "baccalaureat": 6, "diplome_technique": 4, "diplome": 4,
    "certificat": 3, "attestation_generale": 3, "attestation": 2, "lettre_promotion": 2, "lettre_affectation": 2,
    "lettre_felicitation": 2, "lettre_travail": 0, "autre_divers": 0, "releve_notes": 0,
}
BLAME_POINTS = {"legere": -3, "moyenne": -4, "grave": -5}
SENIORITY = ((10, Decimal("1.15")), (5, Decimal("1.10")), (2, Decimal("1.05")), (0, Decimal("1.00")))

CHARGE_DRH = ("CH-0001", "Chargé DRH fictif", "charge.drh@exemple.test")


@dataclass(frozen=True)
class FakeEmployee:
    code: str
    last_name: str
    first_name: str
    hired: date
    department: str
    agency: str
    position: str
    email: str
    superior: str | None = None
    left: date | None = None


# Mêmes personnes que tests/fixtures/employees_test.csv ; AC-1006 est inactif dans Vault, donc sorti ici.
EMPLOYEES = (
    FakeEmployee("AC-1001", "JOSEPH", "Jean", date(2018, 9, 3), "Direction Crédit", "PV", "Agent de crédit",
                 "jean.joseph@exemple.test", superior="AC-1007"),
    FakeEmployee("AC-1002", "PIERRE", "Marie", date(2015, 1, 15), "Service Administration", "AD",
                 "Assistante administrative", "marie.pierre1@exemple.test"),
    FakeEmployee("AC-1003", "PIERRE", "Marie", date(2020, 6, 1), "Direction Opération", "PB", "Caissière",
                 "marie.pierre2@exemple.test"),
    FakeEmployee("AC-1004", "LOUIS", "Paul", date(2012, 4, 12), "Service Recouvrement", "RC",
                 "Agent de recouvrement", "paul.louis@exemple.test"),
    FakeEmployee("AC-1005", "LOUIS", "Paul", date(2012, 4, 12), "Service Recouvrement", "RC",
                 "Agent de recouvrement", ""),
    FakeEmployee("AC-1006", "CHARLES", "Anne", date(2016, 2, 1), "Direction Crédit", "DM", "Analyste",
                 "anne.charles@exemple.test", left=date(2026, 6, 30)),
    FakeEmployee("AC-1007", "ÉTIENNE", "Rosé", date(2005, 10, 20), "", "PV", "Chef d'équipe", ""),
    FakeEmployee("AC-1008", "BAPTISTE", "Marc", date(2024, 3, 1), "Service Administration", "AD", "Coursier",
                 "marc.baptiste@exemple.test"),
)


@dataclass(frozen=True)
class FakePiece:
    code: str
    type: str
    title: str
    day: date
    status: str
    alignment: str = ""
    category: str = ""
    position: str = ""
    place: str = ""
    severity: str | None = None
    scan: str | None = None  # "pdf", "jpeg" ou "png"
    reason: str = ""


PIECES = (
    FakePiece("AC-1001", "licence", "Licence en sciences comptables", date(2017, 7, 15), "valide",
              alignment="acme", category="finance", scan="pdf"),
    FakePiece("AC-1001", "certificat", "Certificat en analyse de crédit", date(2025, 5, 20), "en_attente",
              alignment="acme", category="finance", scan="png"),
    FakePiece("AC-1001", "lettre_promotion", "Promotion au poste d'agent de crédit", date(2022, 3, 1), "valide",
              position="Agent de crédit"),
    FakePiece("AC-1001", "lettre_blame", "Avertissement pour retard", date(2025, 11, 10), "valide",
              severity="legere"),
    FakePiece("AC-1001", "", "scan-diplome.pdf", date(2026, 10, 20), "a_completer", scan="pdf"),
    FakePiece("AC-1002", "master", "Master en gestion des organisations", date(2014, 6, 30), "valide",
              alignment="acme", category="gestion", scan="jpeg"),
    FakePiece("AC-1002", "attestation", "Attestation de suivi bureautique", date(2023, 2, 10), "refuse",
              alignment="acme", category="technologie", reason="Scan illisible"),
    FakePiece("AC-1002", "lettre_affectation", "Affectation à l'agence AD", date(2019, 1, 7), "valide", place="AD"),
    FakePiece("AC-1003", "baccalaureat", "Baccalauréat, série philosophie", date(2012, 7, 1), "en_attente",
              alignment="acme", category="personnel"),
    FakePiece("AC-1003", "certificat", "Certificat de pâtisserie", date(2021, 9, 5), "valide",
              alignment="hors", category="personnel"),
    FakePiece("AC-1004", "diplome_technique", "Diplôme technique en comptabilité", date(2010, 6, 20), "valide",
              alignment="acme", category="finance"),
    FakePiece("AC-1004", "lettre_felicitation", "Félicitations pour les résultats de recouvrement",
              date(2024, 12, 15), "valide"),
    FakePiece("AC-1006", "licence", "Licence en économie", date(2015, 7, 1), "valide",
              alignment="acme", category="finance"),
    FakePiece("AC-1007", "lettre_travail", "Lettre de travail", date(2005, 10, 20), "valide"),
    FakePiece("AC-1008", "", "photo-certificat.jpg", date(2026, 10, 22), "a_completer", scan="jpeg"),
)
# AC-1005 n'a aucune pièce : sa quote reste nulle (« non évaluée »).

SKILLS = (
    {"libelle": "Analyser une demande de crédit", "code": "CRE-01", "famille": "Crédit",
     "definition": "Capacité à analyser une demande de crédit.", "postes": ("Agent de crédit",),
     "pieces": (("licence", "Licence en sciences comptables"),)},
    {"libelle": "Tenir une caisse", "code": "OPE-01", "famille": "Opérations",
     "definition": "Capacité à tenir une caisse.", "postes": ("Caissier (agent de caisse)",), "pieces": ()},
    {"libelle": "Piloter le programme d'activités sociales du personnel", "code": "RH-ASO-01",
     "famille": "Climat social et qualité de vie au travail",
     "definition": "Capacité à piloter le programme d'activités sociales du personnel.", "postes": (), "pieces": ()},
)
LEVELS = ("Initial", "Opérationnel", "Confirmé", "Expert")


class CreationRefused(Exception):
    """La commande refuse d'écrire : production, ou base qui contient déjà Carrières."""


def create(engine: Engine, *, app_env: str) -> dict[str, int]:
    """Crée les tables de Carrières et les remplit ; renvoie le nombre de lignes de chaque table."""
    if app_env == "production":
        raise CreationRefused("Refusé : APP_ENV=production. La base fictive ne se crée jamais en production.")
    existing = sorted(set(CARRIERES_TABLES) & set(inspect(engine).get_table_names()))
    if existing:
        raise CreationRefused(
            f"Refusé : la base contient déjà {', '.join(existing)}. Rien n'a été créé ni modifié."
        )
    with engine.begin() as connection:
        carrieres_metadata.create_all(connection)
        _fill(connection)
        return {
            name: connection.execute(select(func.count()).select_from(table)).scalar_one()
            for name, table in carrieres_metadata.tables.items()
        }


def _fill(connection: Connection) -> None:
    ids = {}
    for e in EMPLOYEES:
        ids[e.code] = connection.execute(employes.insert().values(
            code_employe=e.code, nom=e.last_name, prenom=e.first_name, date_embauche=e.hired, date_sortie=e.left,
            direction=e.department, agence=e.agency, poste=e.position, code_superieur=e.superior, courriel=e.email,
            actif=e.left is None, origine="vault", cree_le=NOW, modifie_le=NOW,
        )).inserted_primary_key[0]

    totals: dict[str, Decimal] = {}
    for index, p in enumerate(PIECES, start=1):
        employee = next(e for e in EMPLOYEES if e.code == p.code)
        content = _scan(p.scan, index) if p.scan else b""
        fingerprint = hashlib.sha256(
            content or f"{p.code}|{p.type}|{p.title}|{p.day}|{NOW.isoformat()}".encode()
        ).hexdigest()
        quote = _quote(p, employee)
        if quote is not None:
            totals[p.code] = totals.get(p.code, Decimal(0)) + quote
        document_id = connection.execute(documents.insert().values(
            employe_id=ids[p.code], type_document=p.type, titre=p.title, date_document=p.day, date_imputation=NOW,
            imputeur_code=CHARGE_DRH[0], imputeur_nom=CHARGE_DRH[1], empreinte_sha256=fingerprint,
            taille_octets=len(content), gravite=p.severity, gravite_derogation=p.type == "lettre_blame",
            quote_document=quote, statut=p.status, est_actif=p.status != "refuse",
            chemin_stockage="base" if content else "", motif_suppression=p.reason, alignement=p.alignment,
            categorie=p.category, poste_vise=p.position, lieu=p.place,
        )).inserted_primary_key[0]
        if content:
            connection.execute(fichiers_document.insert().values(
                document_id=document_id, type_mime=_MIME[p.scan], contenu=content,
            ))
        connection.execute(journal_audit.insert().values(
            horodatage=NOW, acteur_courriel=CHARGE_DRH[2], acteur_role="charge_drh",
            action="depot_lot" if p.status == "a_completer" else "versement_document", cible_type="document",
            cible_id=p.code, detail=json.dumps({"type": p.type, "titre": p.title, "scan": bool(content)}),
        ))

    for code, total in totals.items():
        connection.execute(employes.update().where(employes.c.code_employe == code).values(quote_ressource=total))

    for skill in SKILLS:
        levels = [{"niveau": n, "libelle": label, "description": "", "preuves": "", "indicateurs": ""}
                  for n, label in enumerate(LEVELS, start=1)]
        skill_id = connection.execute(competences_dictionnaire.insert().values(
            libelle=skill["libelle"], code=skill["code"], famille=skill["famille"], definition=skill["definition"],
            verbe_action=skill["libelle"], niveaux=json.dumps(levels, ensure_ascii=False),
        )).inserted_primary_key[0]
        for title in skill["postes"]:
            connection.execute(competences_postes.insert().values(competence_id=skill_id, intitule=title))
        for piece_type, title in skill["pieces"]:
            connection.execute(competences_pieces.insert().values(
                competence_id=skill_id, type_document=piece_type, intitule=title,
            ))
            linked = connection.execute(
                documents.select().where(documents.c.type_document == piece_type, documents.c.titre == title)
            ).all()
            for row in linked:
                connection.execute(documents_competences.insert().values(document_id=row.id, competence_id=skill_id))

    active = [e.code for e in EMPLOYEES if e.left is None]
    connection.execute(vault_actifs.insert(), [{"code_employe": code} for code in active])
    connection.execute(etat_vault.insert().values(
        id=1, etag="fictif", source="vault/vault-employee-list.csv", nombre_actifs=len(active), synchronise_le=NOW,
        message=f"{len(active)} employé(s) actif(s) dans Vault.",
    ))


def _quote(p: FakePiece, employee: FakeEmployee) -> Decimal | None:
    """Quote de la pièce comme Carrières la calcule (dictionnaire §16), ou None si elle n'entre pas dans l'agrégat."""
    if p.status != "valide" or p.alignment == "hors":
        return None
    weight = BLAME_POINTS[p.severity] if p.type == "lettre_blame" else WEIGHTS[p.type]
    if weight == 0:
        return None
    years = Decimal((NOW.date() - employee.hired).days) / Decimal("365.25")
    coefficient = next(c for minimum, c in SENIORITY if years >= minimum)
    return (Decimal(weight) * coefficient).quantize(Decimal("0.000001"))


_MIME = {"pdf": "application/pdf", "jpeg": "image/jpeg", "png": "image/png"}


def _scan(kind: str, index: int) -> bytes:
    """Petit fichier aux vraies signatures ; l'indice rend chaque empreinte unique."""
    marker = f"PAM fictif {index}".encode()
    if kind == "pdf":
        return b"%PDF-1.4\n%" + marker + b"\n%%EOF\n"
    if kind == "jpeg":
        return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + marker + b"\xff\xd9"
    return b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + marker


def main() -> None:
    args = sys.argv[1:]
    settings = Settings()
    if "--database-url" in args:
        url = normalize_database_url(args[args.index("--database-url") + 1])
    else:
        settings.acme_data_dir.mkdir(parents=True, exist_ok=True)  # base SQLite locale par défaut
        url = settings.database_url
    engine = create_engine(url)
    try:
        counts = create(engine, app_env=settings.app_env)
    except CreationRefused as refusal:
        sys.exit(str(refusal))
    finally:
        engine.dispose()
    print("Base Carrières fictive créée :")
    for name, count in counts.items():
        print(f"  {name} : {count}")


if __name__ == "__main__":
    main()
