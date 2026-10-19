"""Certificats : remplacement et archivage des certificats valides (US-304, EF-305, RG-27)

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-11 00:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0013'
down_revision: str | None = '0012'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('certificate', schema=None) as batch_op:
        batch_op.add_column(sa.Column('replaces_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.create_index(batch_op.f('ix_certificate_replaces_id'), ['replaces_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_certificate_is_archived'), ['is_archived'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('certificate', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_certificate_is_archived'))
        batch_op.drop_index(batch_op.f('ix_certificate_replaces_id'))
        batch_op.drop_column('is_archived')
        batch_op.drop_column('replaces_id')
