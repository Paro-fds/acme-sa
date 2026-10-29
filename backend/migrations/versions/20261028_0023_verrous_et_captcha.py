"""verrous par code et par adresse IP, et calculs à résoudre (US-1015)

Revision ID: 0023
Revises: 0022
Create Date: 2026-10-28 18:00:00.000000

Modèle d'authentification du directeur : calcul à 3 échecs, verrous de 1 min, 15 min puis 1 h.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.shared.infrastructure.database import UtcDateTime

revision: str = '0023'
down_revision: str | None = '0022'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'employee_login_lock',
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('failures', sa.Integer(), nullable=False),
        sa.Column('locked_until', UtcDateTime(), nullable=True),
        sa.PrimaryKeyConstraint('key'),
    )
    op.create_table(
        'employee_login_captcha',
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('question', sa.String(), nullable=False),
        sa.Column('answer', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('key'),
    )


def downgrade() -> None:
    op.drop_table('employee_login_captcha')
    op.drop_table('employee_login_lock')
