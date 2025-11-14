"""Supplier portal core tables."""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251115_000005"
down_revision = "20251115_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.supplier_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'viewer',
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMPTZ,
            preferences JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS template_schema.supplier_contract_access (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_user_id UUID NOT NULL REFERENCES template_schema.supplier_users(id) ON DELETE CASCADE,
            jbp_contract_id UUID NOT NULL REFERENCES template_schema.trade_jbp_contracts(id) ON DELETE CASCADE,
            access_level TEXT DEFAULT 'full',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS template_schema.supplier_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_user_id UUID NOT NULL REFERENCES template_schema.supplier_users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT,
            priority TEXT DEFAULT 'medium',
            related_entity_type TEXT,
            related_entity_id UUID,
            is_read BOOLEAN DEFAULT FALSE,
            action_url TEXT,
            action_label TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS template_schema.supplier_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            jbp_contract_id UUID REFERENCES template_schema.trade_jbp_contracts(id),
            report_type TEXT,
            period_start DATE,
            period_end DATE,
            report_data JSONB,
            file_url TEXT,
            status TEXT DEFAULT 'generated',
            created_by UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS template_schema.supplier_reports CASCADE;
        DROP TABLE IF EXISTS template_schema.supplier_notifications CASCADE;
        DROP TABLE IF EXISTS template_schema.supplier_contract_access CASCADE;
        DROP TABLE IF EXISTS template_schema.supplier_users CASCADE;
        """
    )
