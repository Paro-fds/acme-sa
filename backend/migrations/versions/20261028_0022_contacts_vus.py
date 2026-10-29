"""dernier contact vu dans Vault, par employé et par canal (US-1005)

Revision ID: 0022
Revises: 0021
Create Date: 2026-10-28 16:00:00.000000

Un courriel ou un numéro changé ne reçoit pas de code pendant 72 heures (doc PAM).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.shared.infrastructure.database import UtcDateTime

revision: str = '0022'
down_revision: str | None = '0021'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'employee_seen_contact',
        sa.Column('employee_id', sa.String(), nullable=False),
        sa.Column('channel', sa.String(), nullable=False),
        sa.Column('value', sa.String(), nullable=True),
        sa.Column('changed_at', UtcDateTime(), nullable=True),
        sa.PrimaryKeyConstraint('employee_id', 'channel'),
    )


def downgrade() -> None:
    op.drop_table('employee_seen_contact')
