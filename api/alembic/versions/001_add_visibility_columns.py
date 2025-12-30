"""Add visibility columns to patient_prediction_results

Revision ID: 001_visibility
Revises: 
Create Date: 2024-12-30

Adds:
- created_by: TEXT (who created the prediction)
- visibility: TEXT DEFAULT 'patient_visible' (patient_visible / doctor_only)
- patient_summary_json: TEXT (sanitized patient-safe view)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001_visibility'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to patient_prediction_results
    # Using IF NOT EXISTS pattern for PostgreSQL
    op.execute("""
        ALTER TABLE patient_prediction_results 
        ADD COLUMN IF NOT EXISTS created_by TEXT
    """)
    
    op.execute("""
        ALTER TABLE patient_prediction_results 
        ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'patient_visible'
    """)
    
    op.execute("""
        ALTER TABLE patient_prediction_results 
        ADD COLUMN IF NOT EXISTS patient_summary_json TEXT
    """)


def downgrade() -> None:
    # Remove columns (PostgreSQL supports DROP COLUMN IF EXISTS)
    op.execute("""
        ALTER TABLE patient_prediction_results 
        DROP COLUMN IF EXISTS patient_summary_json
    """)
    
    op.execute("""
        ALTER TABLE patient_prediction_results 
        DROP COLUMN IF EXISTS visibility
    """)
    
    op.execute("""
        ALTER TABLE patient_prediction_results 
        DROP COLUMN IF EXISTS created_by
    """)
