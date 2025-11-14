"""Enhance supplier reports and add cache table."""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251115_000008"
down_revision = "20251115_000007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE template_schema.supplier_reports
            ADD COLUMN IF NOT EXISTS title TEXT,
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS included_sections JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS data_snapshot JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generating',
            ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS file_size INTEGER,
            ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

        CREATE TABLE IF NOT EXISTS template_schema.report_data_cache (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            report_id UUID NOT NULL REFERENCES template_schema.supplier_reports(id) ON DELETE CASCADE,
            financial_metrics JSONB,
            proof_summary JSONB,
            performance_analysis JSONB,
            insights JSONB,
            cache_key TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_supplier_reports_supplier
            ON template_schema.supplier_reports (supplier_id, generated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_supplier_reports_type
            ON template_schema.supplier_reports (report_type, period_start);
        CREATE INDEX IF NOT EXISTS idx_report_data_cache_key
            ON template_schema.report_data_cache (cache_key);
        CREATE INDEX IF NOT EXISTS idx_report_data_cache_expires
            ON template_schema.report_data_cache (expires_at);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS idx_report_data_cache_expires;
        DROP INDEX IF EXISTS idx_report_data_cache_key;
        DROP TABLE IF EXISTS template_schema.report_data_cache;
        ALTER TABLE template_schema.supplier_reports
            DROP COLUMN IF EXISTS title,
            DROP COLUMN IF EXISTS description,
            DROP COLUMN IF EXISTS included_sections,
            DROP COLUMN IF EXISTS data_snapshot,
            DROP COLUMN IF EXISTS status,
            DROP COLUMN IF EXISTS version,
            DROP COLUMN IF EXISTS file_size,
            DROP COLUMN IF EXISTS viewed_at,
            DROP COLUMN IF EXISTS download_count;
        """
    )
