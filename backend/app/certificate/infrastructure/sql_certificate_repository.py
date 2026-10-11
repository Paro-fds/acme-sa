"""US-301 : tables `certificate` et `certificate_file` (modèle de données §5.1, §5.2)."""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, delete, func, select
from sqlalchemy.orm import Mapped, mapped_column

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateHistoryEntry, CertificateStatus, Feedback
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class CertificateRow(Base):
    __tablename__ = "certificate"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    certificate_type: Mapped[str] = mapped_column(String)
    level: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    institution: Mapped[str] = mapped_column(String)
    year: Mapped[int] = mapped_column(Integer)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    domain_other: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, index=True)
    submitted_at: Mapped[datetime] = mapped_column(UtcDateTime)
    assigned_to: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    assigned_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    rejection_comment: Mapped[str | None] = mapped_column(String, nullable=True)
    original_level: Mapped[str | None] = mapped_column(String, nullable=True)
    replaces_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class CertificateHistoryRow(Base):
    __tablename__ = "certificate_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    certificate_id: Mapped[str] = mapped_column(ForeignKey("certificate.id"), index=True)
    actor_id: Mapped[str] = mapped_column(String)
    actor_name: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String)
    details: Mapped[str | None] = mapped_column(String, nullable=True)
    at: Mapped[datetime] = mapped_column(UtcDateTime, index=True)


class CertificateFileRow(Base):
    __tablename__ = "certificate_file"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    certificate_id: Mapped[str] = mapped_column(ForeignKey("certificate.id"), index=True)
    storage_key: Mapped[str] = mapped_column(String, unique=True)
    original_name: Mapped[str] = mapped_column(String)
    content_type: Mapped[str] = mapped_column(String)
    size_bytes: Mapped[int] = mapped_column(Integer)


class FeedbackRow(Base):
    """Avis en un clic après le dépôt (modèle de données §4.5) : une note, jamais de commentaire."""

    __tablename__ = "certificate_feedback"

    certificate_id: Mapped[str] = mapped_column(ForeignKey("certificate.id"), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    rating: Mapped[int] = mapped_column(Integer)
    at: Mapped[datetime] = mapped_column(UtcDateTime)


def _certificate(row: CertificateRow) -> Certificate:
    return Certificate(
        row.id,
        row.employee_id,
        row.certificate_type,
        row.level,
        row.title,
        row.institution,
        row.year,
        row.country,
        row.domain,
        row.domain_other,
        CertificateStatus(row.status),
        row.submitted_at,
        assigned_to=row.assigned_to,
        assigned_at=row.assigned_at,
        decided_by=row.decided_by,
        decided_at=row.decided_at,
        rejection_reason=row.rejection_reason,
        rejection_comment=row.rejection_comment,
        original_level=row.original_level,
        replaces_id=row.replaces_id,
        is_archived=row.is_archived,
    )


class SqlCertificateRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def list_for_employee(self, employee_id: str) -> list[Certificate]:
        with self._database.session() as session:
            rows = session.scalars(
                select(CertificateRow)
                .where(CertificateRow.employee_id == employee_id)
                .order_by(CertificateRow.submitted_at.desc(), CertificateRow.id)
            )
            return [_certificate(row) for row in rows]

    def count_for_employee(self, employee_id: str) -> int:
        with self._database.session() as session:
            return session.scalar(select(func.count()).select_from(CertificateRow).where(CertificateRow.employee_id == employee_id)) or 0

    def add(self, certificate: Certificate, file: CertificateFile) -> None:
        with self._database.session() as session:
            session.add(
                CertificateRow(
                    id=certificate.id,
                    employee_id=certificate.employee_id,
                    certificate_type=certificate.certificate_type,
                    level=certificate.level,
                    title=certificate.title,
                    institution=certificate.institution,
                    year=certificate.year,
                    country=certificate.country,
                    domain=certificate.domain,
                    domain_other=certificate.domain_other,
                    status=certificate.status.value,
                    submitted_at=certificate.submitted_at,
                    assigned_to=certificate.assigned_to,
                    assigned_at=certificate.assigned_at,
                    decided_by=certificate.decided_by,
                    decided_at=certificate.decided_at,
                    rejection_reason=certificate.rejection_reason,
                    rejection_comment=certificate.rejection_comment,
                    original_level=certificate.original_level,
                    replaces_id=certificate.replaces_id,
                    is_archived=certificate.is_archived,
                )
            )
            session.flush()
            session.add(
                CertificateFileRow(
                    certificate_id=file.certificate_id,
                    storage_key=file.storage_key,
                    original_name=file.original_name,
                    content_type=file.content_type,
                    size_bytes=file.size_bytes,
                )
            )

    def files_of(self, certificate_id: str) -> list[CertificateFile]:
        with self._database.session() as session:
            rows = session.scalars(
                select(CertificateFileRow).where(CertificateFileRow.certificate_id == certificate_id).order_by(CertificateFileRow.id)
            )
            return [CertificateFile(r.certificate_id, r.storage_key, r.original_name, r.content_type, r.size_bytes) for r in rows]

    def get(self, certificate_id: str) -> Certificate | None:
        with self._database.session() as session:
            row = session.get(CertificateRow, certificate_id)
            return _certificate(row) if row else None

    def update(self, certificate: Certificate) -> None:
        with self._database.session() as session:
            row = session.get(CertificateRow, certificate.id)
            if not row:
                return
            row.certificate_type = certificate.certificate_type
            row.level = certificate.level
            row.title = certificate.title
            row.institution = certificate.institution
            row.year = certificate.year
            row.country = certificate.country
            row.domain = certificate.domain
            row.domain_other = certificate.domain_other
            row.status = certificate.status.value
            row.assigned_to = certificate.assigned_to
            row.assigned_at = certificate.assigned_at
            row.decided_by = certificate.decided_by
            row.decided_at = certificate.decided_at
            row.rejection_reason = certificate.rejection_reason
            row.rejection_comment = certificate.rejection_comment
            row.original_level = certificate.original_level
            row.replaces_id = certificate.replaces_id
            row.is_archived = certificate.is_archived
            session.add(row)

    def delete(self, certificate_id: str) -> None:
        with self._database.session() as session:
            row = session.get(CertificateRow, certificate_id)
            if not row:
                return
            session.execute(delete(CertificateFileRow).where(CertificateFileRow.certificate_id == certificate_id))
            session.execute(delete(CertificateHistoryRow).where(CertificateHistoryRow.certificate_id == certificate_id))
            session.delete(row)

    def list_queue(self, exclude_employee_id: str | None = None) -> list[Certificate]:
        with self._database.session() as session:
            query = select(CertificateRow).where(
                CertificateRow.status.in_([CertificateStatus.RECEIVED.value, CertificateStatus.IN_REVIEW.value])
            )
            if exclude_employee_id:
                query = query.where(CertificateRow.employee_id != exclude_employee_id)
            query = query.order_by(CertificateRow.submitted_at.asc(), CertificateRow.id)
            rows = session.scalars(query)
            return [_certificate(r) for r in rows]

    def list_all(self) -> list[Certificate]:
        with self._database.session() as session:
            rows = session.scalars(select(CertificateRow).order_by(CertificateRow.submitted_at.asc()))
            return [_certificate(r) for r in rows]

    def add_history(self, entry: CertificateHistoryEntry) -> None:
        with self._database.session() as session:
            session.add(
                CertificateHistoryRow(
                    certificate_id=entry.certificate_id,
                    actor_id=entry.actor_id,
                    actor_name=entry.actor_name,
                    action=entry.action,
                    details=entry.details,
                    at=entry.at,
                )
            )

    def history_of(self, certificate_id: str) -> list[CertificateHistoryEntry]:
        with self._database.session() as session:
            rows = session.scalars(
                select(CertificateHistoryRow)
                .where(CertificateHistoryRow.certificate_id == certificate_id)
                .order_by(CertificateHistoryRow.at.asc(), CertificateHistoryRow.id.asc())
            )
            return [
                CertificateHistoryEntry(
                    id=r.id,
                    certificate_id=r.certificate_id,
                    actor_id=r.actor_id,
                    actor_name=r.actor_name,
                    action=r.action,
                    details=r.details,
                    at=r.at,
                )
                for r in rows
            ]

    def set_feedback(self, feedback: Feedback) -> None:
        with self._database.session() as session:
            row = session.get(FeedbackRow, feedback.certificate_id) or FeedbackRow(certificate_id=feedback.certificate_id)
            row.employee_id = feedback.employee_id
            row.rating = feedback.rating
            row.at = feedback.at
            session.add(row)

    def feedbacks(self) -> list[Feedback]:
        with self._database.session() as session:
            rows = session.scalars(select(FeedbackRow).order_by(FeedbackRow.at))
            return [Feedback(r.employee_id, r.certificate_id, r.rating, r.at) for r in rows]
