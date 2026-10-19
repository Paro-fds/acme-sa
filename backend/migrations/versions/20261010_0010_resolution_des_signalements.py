"""resolution des signalements d'erreur

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-10 19:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.shared.infrastructure.database

revision: str = '0010'
down_revision: str | None = '0009'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('error_report', schema=None) as batch_op:
        batch_op.add_column(sa.Column('decided_by', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('decided_at', app.shared.infrastructure.database.UtcDateTime(), nullable=True))
        batch_op.add_column(sa.Column('decision', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('resolution_comment', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('error_report', schema=None) as batch_op:
        batch_op.drop_column('resolution_comment')
        batch_op.drop_column('decision')
        batch_op.drop_column('decided_at')
        batch_op.drop_column('decided_by')
