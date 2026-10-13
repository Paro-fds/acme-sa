"""un poste pour plusieurs unités et plusieurs domaines (US-115)

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-12 12:00:00.000000

Les postes déjà enregistrés gardent leur domaine et leur unité : chacun devient la première ligne de sa table.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0016'
down_revision: str | None = '0015'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'job_opening_domain',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('opening_id', sa.Integer(), nullable=False),
        sa.Column('domain', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['opening_id'], ['job_opening.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_opening_domain', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_opening_domain_opening_id'), ['opening_id'], unique=False)

    op.create_table(
        'job_opening_unit',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('opening_id', sa.Integer(), nullable=False),
        sa.Column('unit_code', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['opening_id'], ['job_opening.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_opening_unit', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_opening_unit_opening_id'), ['opening_id'], unique=False)

    op.execute(
        "INSERT INTO job_opening_domain (opening_id, domain) "
        "SELECT id, domain FROM job_opening WHERE domain IS NOT NULL AND domain <> '' ORDER BY id"
    )
    op.execute(
        "INSERT INTO job_opening_unit (opening_id, unit_code) "
        "SELECT id, criteria_unit_code FROM job_opening "
        "WHERE criteria_unit_code IS NOT NULL AND criteria_unit_code <> '' ORDER BY id"
    )
    # ALTER TABLE direct (SQLite 3.35 et PostgreSQL) : recréer la table, comme le mode batch, casserait les clés
    # étrangères des étapes, traces et candidatures qui la référencent.
    op.drop_column('job_opening', 'criteria_unit_code')
    op.drop_column('job_opening', 'domain')


def downgrade() -> None:
    """Revient à une seule unité et un seul domaine : la première ligne de chaque poste."""
    op.add_column('job_opening', sa.Column('domain', sa.String(), nullable=True))
    op.add_column('job_opening', sa.Column('criteria_unit_code', sa.String(), nullable=True))
    op.execute(
        "UPDATE job_opening SET domain = (SELECT d.domain FROM job_opening_domain d "
        "WHERE d.opening_id = job_opening.id ORDER BY d.id LIMIT 1)"
    )
    op.execute(
        "UPDATE job_opening SET criteria_unit_code = (SELECT u.unit_code FROM job_opening_unit u "
        "WHERE u.opening_id = job_opening.id ORDER BY u.id LIMIT 1)"
    )
    with op.batch_alter_table('job_opening_unit', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_opening_unit_opening_id'))
    op.drop_table('job_opening_unit')
    with op.batch_alter_table('job_opening_domain', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_opening_domain_opening_id'))
    op.drop_table('job_opening_domain')
