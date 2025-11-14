"""Foundation tables for proof uploads."""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251115_000006"
down_revision = "20251115_000005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.asset_proofs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            asset_id UUID NOT NULL REFERENCES template_schema.trade_jbp_contract_assets(id) ON DELETE CASCADE,
            supplier_user_id UUID,
            file_name VARCHAR(500) NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            file_path VARCHAR(1000) NOT NULL,
            proof_type VARCHAR(50) NOT NULL CHECK (proof_type IN ('screenshot','photo','video','document')),
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_asset_proofs_asset_id ON template_schema.asset_proofs(asset_id);
        CREATE INDEX IF NOT EXISTS idx_asset_proofs_status ON template_schema.asset_proofs(status);
        CREATE INDEX IF NOT EXISTS idx_asset_proofs_created_at ON template_schema.asset_proofs(created_at);

        CREATE TABLE IF NOT EXISTS template_schema.proof_validations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            proof_id UUID NOT NULL REFERENCES template_schema.asset_proofs(id) ON DELETE CASCADE,
            validation_type VARCHAR(100) NOT NULL,
            passed BOOLEAN NOT NULL,
            message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS template_schema.proof_validations CASCADE;
        DROP TABLE IF EXISTS template_schema.asset_proofs CASCADE;
        """
    )
