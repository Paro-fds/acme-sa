"""notifications de l'espace de gestion : ce que chaque compte RH a lu (US-116)

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-12 18:00:00.000000

Les notifications elles-mêmes se calculent à partir des certificats, signalements et candidatures.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.shared.infrastructure.database

revision: str = '0017'
down_revision: str | None = '0016'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'admin_notification_read',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('admin_id', sa.String(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('read_at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('admin_notification_read', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_admin_notification_read_admin_id'), ['admin_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_admin_notification_read_read_at'), ['read_at'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('admin_notification_read', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_admin_notification_read_read_at'))
        batch_op.drop_index(batch_op.f('ix_admin_notification_read_admin_id'))
    op.drop_table('admin_notification_read')
