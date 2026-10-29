"""quota des codes de connexion envoyés par WhatsApp (US-1004)

Revision ID: 0021
Revises: 0020
Create Date: 2026-10-28 12:00:00.000000

5 messages par employé et par mois civil, renvois compris (doc PAM).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0021'
down_revision: str | None = '0020'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'employee_whatsapp_quota',
        sa.Column('employee_id', sa.String(), nullable=False),
        sa.Column('month', sa.String(), nullable=False),
        sa.Column('used', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('employee_id', 'month'),
    )


def downgrade() -> None:
    op.drop_table('employee_whatsapp_quota')
