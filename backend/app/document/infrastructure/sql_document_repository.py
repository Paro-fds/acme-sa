from datetime import datetime

from sqlalchemy import Integer, String, delete, select
from sqlalchemy.orm import Mapped, mapped_column

from app.document.domain.document import Document, DocumentType
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class DocumentRow(Base):
    __tablename__ = "document"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    document_type: Mapped[str] = mapped_column(String)
    original_name: Mapped[str] = mapped_column(String)
    stored_name: Mapped[str] = mapped_column(String, unique=True)
    content_type: Mapped[str] = mapped_column(String)
    size_bytes: Mapped[int] = mapped_column(Integer)
    uploaded_at: Mapped[datetime] = mapped_column(UtcDateTime)


def _to_domain(row: DocumentRow) -> Document:
    return Document(
        id=row.id,
        employee_id=row.employee_id,
        document_type=DocumentType(row.document_type),
        original_name=row.original_name,
        stored_name=row.stored_name,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        uploaded_at=row.uploaded_at,
    )


class SqlDocumentRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def list_for_employee(self, employee_id: str) -> list[Document]:
        with self._database.session() as session:
            rows = session.scalars(
                select(DocumentRow)
                .where(DocumentRow.employee_id == employee_id)
                .order_by(DocumentRow.uploaded_at, DocumentRow.id)
            )
            return [_to_domain(row) for row in rows]

    def get(self, document_id: str) -> Document | None:
        with self._database.session() as session:
            row = session.get(DocumentRow, document_id)
            return _to_domain(row) if row else None

    def add(self, document: Document) -> None:
        with self._database.session() as session:
            session.add(
                DocumentRow(
                    id=document.id,
                    employee_id=document.employee_id,
                    document_type=document.document_type.value,
                    original_name=document.original_name,
                    stored_name=document.stored_name,
                    content_type=document.content_type,
                    size_bytes=document.size_bytes,
                    uploaded_at=document.uploaded_at,
                )
            )

    def delete(self, document_id: str) -> None:
        with self._database.session() as session:
            session.execute(delete(DocumentRow).where(DocumentRow.id == document_id))
