"""US-202, US-203 : tables du dossier (modèle de données §4.1 Dossier, §4.2 Contact d'urgence, §4.3 Confirmation,
§4.4 Signalement d'erreur, §4.6 Consentement)."""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, select
from sqlalchemy.orm import Mapped, mapped_column

from app.dossier.domain.dossier import Confirmation, Consent, ConsentSubject, Dossier, EmergencyContact, Gesture
from app.dossier.domain.hr_information import Report, ReportOrigin
from app.shared.infrastructure.database import Base, Database, UtcDateTime


class DossierRow(Base):
    __tablename__ = "dossier"

    employee_id: Mapped[str] = mapped_column(String, primary_key=True)
    telephone: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    no_email: Mapped[bool] = mapped_column(Boolean, default=False)
    education_level: Mapped[str | None] = mapped_column(String, nullable=True)


class EmergencyContactRow(Base):
    """🔴 Donnée sur un tiers (§8.2) : à part du dossier."""

    __tablename__ = "emergency_contact"

    employee_id: Mapped[str] = mapped_column(ForeignKey("dossier.employee_id"), primary_key=True)
    name: Mapped[str] = mapped_column(String)
    relationship: Mapped[str] = mapped_column(String)
    telephone: Mapped[str] = mapped_column(String)


class ConfirmationRow(Base):
    __tablename__ = "dossier_confirmation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    information: Mapped[str] = mapped_column(String)
    gesture: Mapped[str] = mapped_column(String)
    old_value: Mapped[str | None] = mapped_column(String, nullable=True)
    new_value: Mapped[str] = mapped_column(String)
    at: Mapped[datetime] = mapped_column(UtcDateTime)
    author: Mapped[str] = mapped_column(String)


class ConsentRow(Base):
    __tablename__ = "consent"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    subject: Mapped[str] = mapped_column(String)
    given: Mapped[bool] = mapped_column(Boolean)
    at: Mapped[datetime] = mapped_column(UtcDateTime)
    text_version: Mapped[str] = mapped_column(String)


class ReportRow(Base):
    """Signalement d'erreur sur agence, poste ou date d'embauche ; traité par les RH au lot 2 (US-403)."""

    __tablename__ = "error_report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[str] = mapped_column(String, index=True)
    information: Mapped[str] = mapped_column(String)
    origin: Mapped[str] = mapped_column(String)
    current_value: Mapped[str] = mapped_column(String)
    indicated_value: Mapped[str | None] = mapped_column(String, nullable=True)
    comment: Mapped[str | None] = mapped_column(String, nullable=True)
    at: Mapped[datetime] = mapped_column(UtcDateTime)
    status: Mapped[str] = mapped_column(String)


def _confirmation_row(c: Confirmation) -> ConfirmationRow:
    return ConfirmationRow(
        employee_id=c.employee_id,
        information=c.information,
        gesture=c.gesture.value,
        old_value=c.old_value,
        new_value=c.new_value,
        at=c.at,
        author=c.author,
    )


class SqlDossierRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def get(self, employee_id: str) -> Dossier | None:
        with self._database.session() as session:
            row = session.get(DossierRow, employee_id)
            if row is None:
                return None
            contact = session.get(EmergencyContactRow, employee_id)
            return Dossier(
                employee_id,
                row.telephone,
                row.address,
                row.email,
                row.no_email,
                row.education_level,
                EmergencyContact(contact.name, contact.relationship, contact.telephone) if contact else None,
            )

    def save(self, dossier: Dossier, confirmations: list[Confirmation]) -> None:
        with self._database.session() as session:
            row = session.get(DossierRow, dossier.employee_id) or DossierRow(employee_id=dossier.employee_id)
            row.telephone = dossier.telephone
            row.address = dossier.address
            row.email = dossier.email
            row.no_email = dossier.no_email
            row.education_level = dossier.education_level
            session.add(row)
            session.flush()

            contact = session.get(EmergencyContactRow, dossier.employee_id)
            if dossier.emergency_contact is None:
                if contact is not None:
                    session.delete(contact)
            else:
                contact = contact or EmergencyContactRow(employee_id=dossier.employee_id)
                contact.name = dossier.emergency_contact.name
                contact.relationship = dossier.emergency_contact.relationship
                contact.telephone = dossier.emergency_contact.telephone
                session.add(contact)

            session.add_all(_confirmation_row(c) for c in confirmations)

    def confirmations(self, employee_id: str) -> list[Confirmation]:
        with self._database.session() as session:
            rows = session.scalars(
                select(ConfirmationRow).where(ConfirmationRow.employee_id == employee_id).order_by(ConfirmationRow.id)
            )
            return [
                Confirmation(r.employee_id, r.information, Gesture(r.gesture), r.old_value, r.new_value, r.at, r.author)
                for r in rows
            ]

    def consents(self, employee_id: str) -> list[Consent]:
        with self._database.session() as session:
            rows = session.scalars(select(ConsentRow).where(ConsentRow.employee_id == employee_id).order_by(ConsentRow.id))
            return [Consent(r.employee_id, ConsentSubject(r.subject), r.given, r.at, r.text_version) for r in rows]

    def add_consents(self, consents: list[Consent]) -> None:
        with self._database.session() as session:
            session.add_all(
                ConsentRow(
                    employee_id=c.employee_id, subject=c.subject.value, given=c.given, at=c.at, text_version=c.text_version
                )
                for c in consents
            )

    def add_confirmation(self, confirmation: Confirmation) -> None:
        with self._database.session() as session:
            session.add(_confirmation_row(confirmation))

    def reports(self, employee_id: str) -> list[Report]:
        with self._database.session() as session:
            rows = session.scalars(select(ReportRow).where(ReportRow.employee_id == employee_id).order_by(ReportRow.id))
            return [
                Report(r.employee_id, r.information, ReportOrigin(r.origin), r.current_value, r.indicated_value, r.comment, r.at, r.status)
                for r in rows
            ]

    def add_report(self, report: Report) -> None:
        with self._database.session() as session:
            session.add(
                ReportRow(
                    employee_id=report.employee_id,
                    information=report.information,
                    origin=report.origin.value,
                    current_value=report.current_value,
                    indicated_value=report.indicated_value,
                    comment=report.comment,
                    at=report.at,
                    status=report.status,
                )
            )
