"""poste ouvert issu d'une fiche du catalogue des postes ACME (US-119)

Revision ID: 0018
Revises: 0017
Create Date: 2026-10-14 12:00:00.000000

Le catalogue lui-même est un fichier en lecture seule (app/job/infrastructure/fiches-de-poste.json).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0018'
down_revision: str | None = '0017'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('job_opening', schema=None) as batch_op:
        batch_op.add_column(sa.Column('profile_code', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('job_opening', schema=None) as batch_op:
        batch_op.drop_column('profile_code')
