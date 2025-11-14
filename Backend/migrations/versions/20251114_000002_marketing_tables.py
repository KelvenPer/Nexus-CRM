"""marketing module base tables (per-tenant schema template)

Creates marketing_segments, marketing_segment_filters, marketing_segment_members,
marketing_campaigns, marketing_campaign_segments in template_schema so that
tenant schemas cloned from it include these tables.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251114_000002"
down_revision = "20251114_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Segments header
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.marketing_segments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome TEXT NOT NULL,
            regra TEXT NOT NULL,
            tamanho INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_marketing_segments_nome
            ON template_schema.marketing_segments (nome)
        """
    )

    # Segment filters (for dynamic segments)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.marketing_segment_filters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            segment_id UUID NOT NULL,
            rule_name TEXT NOT NULL,
            rule_payload JSONB NOT NULL,
            position INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_segment_filters_segment
                FOREIGN KEY (segment_id) REFERENCES template_schema.marketing_segments(id)
                ON DELETE CASCADE
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_marketing_segment_filters_segment
            ON template_schema.marketing_segment_filters (segment_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_marketing_segment_filters_payload_json
            ON template_schema.marketing_segment_filters
            USING GIN (rule_payload)
        """
    )

    # Segment members (materialization)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.marketing_segment_members (
            segment_id UUID NOT NULL,
            contact_id UUID NOT NULL,
            added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            source TEXT NOT NULL,
            PRIMARY KEY (segment_id, contact_id),
            CONSTRAINT fk_segment_members_segment
                FOREIGN KEY (segment_id) REFERENCES template_schema.marketing_segments(id)
                ON DELETE CASCADE
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_segment_members_contact
            ON template_schema.marketing_segment_members (contact_id)
        """
    )

    # Campaigns header (mapped to current Pydantic)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.marketing_campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nome TEXT NOT NULL,
            status TEXT NOT NULL,
            investimento NUMERIC(14,2) NOT NULL,
            inicio DATE NOT NULL,
            fim DATE NOT NULL,
            owner_user_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status
            ON template_schema.marketing_campaigns (status)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_periodo
            ON template_schema.marketing_campaigns (inicio, fim)
        """
    )

    # Campaign x Segment (N:N)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.marketing_campaign_segments (
            campaign_id UUID NOT NULL,
            segment_id UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (campaign_id, segment_id),
            CONSTRAINT fk_campaign_segments_campaign
                FOREIGN KEY (campaign_id) REFERENCES template_schema.marketing_campaigns(id)
                ON DELETE CASCADE,
            CONSTRAINT fk_campaign_segments_segment
                FOREIGN KEY (segment_id) REFERENCES template_schema.marketing_segments(id)
                ON DELETE RESTRICT
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_campaign_segments_segment
            ON template_schema.marketing_campaign_segments (segment_id)
        """
    )


def downgrade() -> None:
    for stmt in [
        "template_schema.marketing_campaign_segments",
        "template_schema.marketing_campaigns",
        "template_schema.marketing_segment_members",
        "template_schema.marketing_segment_filters",
        "template_schema.marketing_segments",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {stmt} CASCADE")

