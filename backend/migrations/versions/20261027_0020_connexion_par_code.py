"""connexion des employés par un code reçu par courriel (US-1003)

Revision ID: 0020
Revises: 0019
Create Date: 2026-10-27 12:00:00.000000

Verrouillage progressif (`employee_account.lockouts`) et dernier code de connexion de chaque employé
(empreinte HMAC seulement). La colonne `password_hash` reste, vide : plus de mot de passe employé.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.shared.infrastructure.database import UtcDateTime

revision: str = '0020'
down_revision: str | None = '0019'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('employee_account', schema=None) as batch_op:
        batch_op.add_column(sa.Column('lockouts', sa.Integer(), server_default='0', nullable=False))
    op.create_table(
        'employee_login_code',
        sa.Column('employee_id', sa.String(), nullable=False),
        sa.Column('channel', sa.String(), nullable=False),
        sa.Column('code_hash', sa.String(), nullable=False),
        sa.Column('session_ref', sa.String(), nullable=False),
        sa.Column('expires_at', UtcDateTime(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('sent_at', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('employee_id'),
    )


def downgrade() -> None:
    op.drop_table('employee_login_code')
    with op.batch_alter_table('employee_account', schema=None) as batch_op:
        batch_op.drop_column('lockouts')
