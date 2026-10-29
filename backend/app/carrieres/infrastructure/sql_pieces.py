"""US-1007 : écriture des pièces dans la base de Carrières (lecture et ajout seuls, D-50)."""

import json

from sqlalchemy import Engine, exists, or_, select
from sqlalchemy.exc import IntegrityError

from app.carrieres.domain.pieces import (
    FORMATIONS,
    STATUS_LABELS,
    TO_COMPLETE,
    CarrieresEmployee,
    DuplicatePiece,
    MyPiece,
    NewPiece,
    PieceFile,
)
from app.carrieres.infrastructure.tables import documents, employes, fichiers_document, journal_audit, vault_actifs


class SqlCarrieresPieces:
    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def active_employee(self, code: str) -> CarrieresEmployee | None:
        query = (
            select(employes.c.id, employes.c.code_employe)
            .join(vault_actifs, vault_actifs.c.code_employe == employes.c.code_employe)
            .where(employes.c.code_employe == code)
        )
        with self._engine.connect() as connection:
            row = connection.execute(query).first()
        return None if row is None else CarrieresEmployee(row.id, row.code_employe)

    def has_fingerprint(self, employee_id: int, fingerprint: str) -> bool:
        query = select(
            exists().where(documents.c.employe_id == employee_id, documents.c.empreinte_sha256 == fingerprint)
        )
        with self._engine.connect() as connection:
            return bool(connection.execute(query).scalar())

    def deposit(self, piece: NewPiece) -> int:
        # Comme un dépôt de lot de Carrières : rien n'est qualifié, la DRH complète la pièce.
        try:
            with self._engine.begin() as connection:
                document_id = connection.execute(documents.insert().values(
                    employe_id=piece.employee.id, type_document="", titre=piece.title,
                    date_document=piece.document_date, date_imputation=piece.deposited_at,
                    imputeur_code=piece.employee.code, imputeur_nom=piece.depositor_name[:180],
                    empreinte_sha256=piece.fingerprint, taille_octets=len(piece.content), nombre_pages=0,
                    gravite=None, gravite_derogation=False, quote_document=None, statut=TO_COMPLETE, version=1,
                    est_actif=True, chemin_stockage="base", motif_suppression="", alignement="", categorie="",
                    poste_vise="", lieu="",
                )).inserted_primary_key[0]
                connection.execute(fichiers_document.insert().values(
                    document_id=document_id, type_mime=piece.content_type, contenu=piece.content,
                ))
                connection.execute(journal_audit.insert().values(
                    horodatage=piece.deposited_at, acteur_courriel=piece.depositor_email or piece.employee.code,
                    acteur_role="employe", action="versement_document", cible_type="document",
                    cible_id=piece.employee.code, detail=json.dumps({"document_id": document_id, "origine": "PAM"}),
                    adresse_ip="",
                ))
        except IntegrityError as error:  # deux envois simultanés du même fichier
            raise DuplicatePiece() from error
        return document_id

    def pieces_of(self, employee_id: int) -> list[MyPiece]:
        has_file = exists().where(fichiers_document.c.document_id == documents.c.id)
        query = (
            select(documents, has_file.label("has_file"))
            .where(
                documents.c.employe_id == employee_id,
                or_(documents.c.type_document.in_(FORMATIONS), documents.c.type_document == ""),
            )
            .order_by(documents.c.date_imputation.desc(), documents.c.id.desc())
        )
        with self._engine.connect() as connection:
            rows = connection.execute(query).mappings().all()
        return [
            MyPiece(
                id=row["id"],
                title=row["titre"],
                type_label=FORMATIONS.get(row["type_document"]),
                status=row["statut"],
                status_label=STATUS_LABELS.get(row["statut"], row["statut"]),
                document_date=row["date_document"],
                deposited_at=row["date_imputation"],
                refusal_reason=(row["motif_suppression"] or None) if row["statut"] == "refuse" else None,
                has_file=bool(row["has_file"]),
            )
            for row in rows
        ]

    def file_of(self, employee_id: int, piece_id: int) -> PieceFile | None:
        query = (
            select(fichiers_document.c.type_mime, fichiers_document.c.contenu)
            .join(documents, documents.c.id == fichiers_document.c.document_id)
            .where(documents.c.id == piece_id, documents.c.employe_id == employee_id)
        )
        with self._engine.connect() as connection:
            row = connection.execute(query).first()
        return None if row is None else PieceFile(row.type_mime, bytes(row.contenu))
