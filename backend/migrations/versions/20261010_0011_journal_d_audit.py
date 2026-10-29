"""journal d'audit RH

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-10 21:50:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.shared.infrastructure.database

revision: str = '0011'
down_revision: str | None = '0010'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('actor_name', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('target_id', sa.String(), nullable=False),
        sa.Column('target_name', sa.String(), nullable=True),
        sa.Column('details', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_log_actor_id'), ['actor_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_log_target_id'), ['target_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_log_at'), ['at'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_log_at'))
        batch_op.drop_index(batch_op.f('ix_audit_log_target_id'))
        batch_op.drop_index(batch_op.f('ix_audit_log_actor_id'))
    op.drop_table('audit_log')
