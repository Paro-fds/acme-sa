"""Gestion des comptes RH : nom, email, matricule rattache et activation/desactivation (US-104)

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-10 23:55:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0012'
down_revision: str | None = '0011'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('admin_account', schema=None) as batch_op:
        batch_op.add_column(sa.Column('full_name', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('email', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('employee_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    with op.batch_alter_table('admin_account', schema=None) as batch_op:
        batch_op.drop_column('is_active')
        batch_op.drop_column('employee_id')
        batch_op.drop_column('email')
        batch_op.drop_column('full_name')
