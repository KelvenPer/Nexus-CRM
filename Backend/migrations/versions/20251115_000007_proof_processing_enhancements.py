"""Enhance proof tables with processing metadata."""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251115_000007"
down_revision = "20251115_000006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE template_schema.asset_proofs
            ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(1000),
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending'
                CHECK (processing_status IN ('pending','processing','completed','failed')),
            ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

        CREATE TABLE IF NOT EXISTS template_schema.proof_metadata (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            proof_id UUID NOT NULL REFERENCES template_schema.asset_proofs(id) ON DELETE CASCADE,
            image_width INTEGER,
            image_height INTEGER,
            dominant_color VARCHAR(7),
            has_geolocation BOOLEAN DEFAULT FALSE,
            page_count INTEGER,
            pdf_author TEXT,
            video_duration INTEGER,
            video_format TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_proof_metadata_image ON template_schema.proof_metadata(image_width, image_height);
        CREATE INDEX IF NOT EXISTS idx_proof_metadata_geo ON template_schema.proof_metadata(has_geolocation) WHERE has_geolocation = TRUE;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS template_schema.proof_metadata CASCADE;
        ALTER TABLE template_schema.asset_proofs
            DROP COLUMN IF EXISTS thumbnail_path,
            DROP COLUMN IF EXISTS metadata,
            DROP COLUMN IF EXISTS processing_status,
            DROP COLUMN IF EXISTS file_hash;
        """
    )
