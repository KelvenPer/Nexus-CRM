"""Trade proof module tables."""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251115_000004"
down_revision = "20251115_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.trade_jbp_contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            total_investment NUMERIC(15,2) NOT NULL DEFAULT 0,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            proof_status TEXT NOT NULL DEFAULT 'pending',
            completion_percentage NUMERIC(5,2) DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_jbp_contract_assets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            contract_id UUID NOT NULL REFERENCES template_schema.trade_jbp_contracts(id) ON DELETE CASCADE,
            asset_catalog_id TEXT NOT NULL,
            asset_name TEXT NOT NULL,
            placement TEXT,
            duration_days INTEGER NOT NULL,
            cost NUMERIC(15,2) NOT NULL DEFAULT 0,
            scheduled_start DATE NOT NULL,
            scheduled_end DATE NOT NULL,
            actual_start DATE,
            actual_end DATE,
            status TEXT NOT NULL DEFAULT 'scheduled',
            proofs_required JSONB DEFAULT '[]'::jsonb,
            metrics JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_asset_proofs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            contract_asset_id UUID NOT NULL REFERENCES template_schema.trade_jbp_contract_assets(id) ON DELETE CASCADE,
            proof_type TEXT NOT NULL,
            url TEXT NOT NULL,
            description TEXT,
            uploaded_by TEXT,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            verified BOOLEAN NOT NULL DEFAULT FALSE,
            verified_by TEXT,
            verified_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_asset_automated_proofs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            contract_asset_id UUID NOT NULL REFERENCES template_schema.trade_jbp_contract_assets(id) ON DELETE CASCADE,
            source TEXT NOT NULL,
            metric TEXT NOT NULL,
            target_value NUMERIC(15,2),
            value NUMERIC(15,2),
            capture_schedule TEXT,
            captured_at TIMESTAMPTZ DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'active',
            metadata JSONB DEFAULT '{}'::jsonb
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_proof_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            contract_asset_id UUID NOT NULL REFERENCES template_schema.trade_jbp_contract_assets(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            send_at TIMESTAMPTZ NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            channel TEXT DEFAULT 'email',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_trade_contracts_supplier ON template_schema.trade_jbp_contracts (supplier_id);
        CREATE INDEX IF NOT EXISTS idx_trade_assets_contract ON template_schema.trade_jbp_contract_assets (contract_id);
        CREATE INDEX IF NOT EXISTS idx_trade_proofs_asset ON template_schema.trade_asset_proofs (contract_asset_id);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS template_schema.trade_proof_notifications CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_asset_automated_proofs CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_asset_proofs CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_jbp_contract_assets CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_jbp_contracts CASCADE;
        """
    )
