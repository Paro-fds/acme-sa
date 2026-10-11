"""validation des certificats : file commune, assignation, decisions et historique

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-10 18:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.shared.infrastructure.database

revision: str = '0009'
down_revision: str | None = '0008'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('certificate', schema=None) as batch_op:
        batch_op.add_column(sa.Column('assigned_to', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('assigned_at', app.shared.infrastructure.database.UtcDateTime(), nullable=True))
        batch_op.add_column(sa.Column('decided_by', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('decided_at', app.shared.infrastructure.database.UtcDateTime(), nullable=True))
        batch_op.add_column(sa.Column('rejection_reason', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('rejection_comment', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('original_level', sa.String(), nullable=True))
        batch_op.create_index(batch_op.f('ix_certificate_assigned_to'), ['assigned_to'], unique=False)
        batch_op.create_index(batch_op.f('ix_certificate_status'), ['status'], unique=False)

    op.create_table(
        'certificate_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('certificate_id', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('actor_name', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', sa.String(), nullable=True),
        sa.Column('at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.ForeignKeyConstraint(['certificate_id'], ['certificate.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('certificate_history', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_certificate_history_certificate_id'), ['certificate_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_certificate_history_at'), ['at'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('certificate_history', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_certificate_history_at'))
        batch_op.drop_index(batch_op.f('ix_certificate_history_certificate_id'))

    op.drop_table('certificate_history')

    with op.batch_alter_table('certificate', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_certificate_status'))
        batch_op.drop_index(batch_op.f('ix_certificate_assigned_to'))
        batch_op.drop_column('original_level')
        batch_op.drop_column('rejection_comment')
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('decided_at')
        batch_op.drop_column('decided_by')
        batch_op.drop_column('assigned_at')
        batch_op.drop_column('assigned_to')
