"""lettre du directeur RH jointe à la publication d'un poste (US-124)

Revision ID: 0019
Revises: 0018
Create Date: 2026-10-17 12:00:00.000000

Le fichier lui-même est dans le stockage privé des certificats (job-letters/<identifiant aléatoire>).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.shared.infrastructure.database import UtcDateTime

revision: str = '0019'
down_revision: str | None = '0018'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMNS = (
    ('letter_key', sa.String),
    ('letter_name', sa.String),
    ('letter_content_type', sa.String),
    ('letter_size_bytes', sa.Integer),
    ('letter_at', UtcDateTime),
    ('letter_actor_id', sa.String),
    ('letter_actor_name', sa.String),
)


def upgrade() -> None:
    with op.batch_alter_table('job_opening', schema=None) as batch_op:
        for name, kind in _COLUMNS:
            batch_op.add_column(sa.Column(name, kind(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('job_opening', schema=None) as batch_op:
        for name, _ in reversed(_COLUMNS):
            batch_op.drop_column(name)
