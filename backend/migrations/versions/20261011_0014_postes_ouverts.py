"""postes ouverts (US-802)

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-11 10:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.shared.infrastructure.database

revision: str = '0014'
down_revision: str | None = '0013'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'job_opening',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('unit_code', sa.String(), nullable=False),
        sa.Column('target_grade', sa.String(), nullable=False),
        sa.Column('mission', sa.Text(), nullable=False),
        sa.Column('opens_on', sa.Date(), nullable=False),
        sa.Column('closes_on', sa.Date(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('min_level', sa.String(), nullable=True),
        sa.Column('domain', sa.String(), nullable=True),
        sa.Column('min_years_in_institution', sa.Integer(), nullable=True),
        sa.Column('min_years_in_position', sa.Integer(), nullable=True),
        sa.Column('min_grade', sa.String(), nullable=True),
        sa.Column('criteria_unit_code', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    with op.batch_alter_table('job_opening', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_opening_status'), ['status'], unique=False)

    op.create_table(
        'job_opening_step',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('opening_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('actor_name', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['opening_id'], ['job_opening.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_opening_step', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_opening_step_opening_id'), ['opening_id'], unique=False)

    op.create_table(
        'job_opening_criteria_change',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('opening_id', sa.Integer(), nullable=False),
        sa.Column('at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('actor_name', sa.String(), nullable=False),
        sa.Column('before', sa.Text(), nullable=False),
        sa.Column('after', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['opening_id'], ['job_opening.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_opening_criteria_change', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_opening_criteria_change_opening_id'), ['opening_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('job_opening_criteria_change', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_opening_criteria_change_opening_id'))
    op.drop_table('job_opening_criteria_change')
    with op.batch_alter_table('job_opening_step', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_opening_step_opening_id'))
    op.drop_table('job_opening_step')
    with op.batch_alter_table('job_opening', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_opening_status'))
    op.drop_table('job_opening')
