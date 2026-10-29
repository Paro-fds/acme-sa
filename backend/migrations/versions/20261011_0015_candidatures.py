"""candidatures aux postes, CV et profil au moment de la candidature (US-902)

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-11 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.shared.infrastructure.database

revision: str = '0015'
down_revision: str | None = '0014'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'job_application',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('opening_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.String(), nullable=False),
        sa.Column('motivation', sa.Text(), nullable=False),
        sa.Column('received_at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.Column('step', sa.String(), nullable=False),
        sa.Column('outcome', sa.String(), nullable=True),
        sa.Column('cv_key', sa.String(), nullable=True),
        sa.Column('cv_name', sa.String(), nullable=True),
        sa.Column('cv_content_type', sa.String(), nullable=True),
        sa.Column('cv_size_bytes', sa.Integer(), nullable=True),
        sa.Column('profile_snapshot', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['opening_id'], ['job_opening.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_application', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_application_opening_id'), ['opening_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_job_application_employee_id'), ['employee_id'], unique=False)

    op.create_table(
        'job_application_step',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('application_id', sa.Integer(), nullable=False),
        sa.Column('step', sa.String(), nullable=False),
        sa.Column('outcome', sa.String(), nullable=True),
        sa.Column('at', app.shared.infrastructure.database.UtcDateTime(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('actor_name', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['application_id'], ['job_application.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_application_step', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_application_step_application_id'), ['application_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('job_application_step', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_application_step_application_id'))
    op.drop_table('job_application_step')
    with op.batch_alter_table('job_application', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_job_application_employee_id'))
        batch_op.drop_index(batch_op.f('ix_job_application_opening_id'))
    op.drop_table('job_application')
