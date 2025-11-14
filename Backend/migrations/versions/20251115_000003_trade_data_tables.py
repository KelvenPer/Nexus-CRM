"""Trade marketing core tables."""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251115_000003"
down_revision = "20251114_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.trade_suppliers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name TEXT NOT NULL,
            cnpj VARCHAR(20),
            email TEXT,
            phone TEXT,
            category TEXT,
            business_size TEXT,
            priority_level INTEGER,
            payment_terms TEXT,
            strategic_importance TEXT,
            total_investment NUMERIC(15,2) DEFAULT 0,
            total_sales NUMERIC(15,2) DEFAULT 0,
            average_roi NUMERIC(5,2),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, cnpj)
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_jbp_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            title TEXT NOT NULL,
            description TEXT,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            investment_value NUMERIC(15,2) NOT NULL,
            investment_type TEXT,
            expected_roi NUMERIC(5,2),
            counter_parties JSONB DEFAULT '[]'::jsonb,
            exclusive_benefits JSONB DEFAULT '[]'::jsonb,
            status TEXT NOT NULL DEFAULT 'draft',
            approved_by UUID,
            approved_at TIMESTAMPTZ,
            sales_target NUMERIC(15,2),
            growth_target NUMERIC(5,2),
            actual_sales NUMERIC(15,2),
            actual_roi NUMERIC(5,2),
            goal_achievement NUMERIC(5,2),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_supplier_sales (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            jbp_plan_id UUID REFERENCES template_schema.trade_jbp_plans(id),
            year INTEGER NOT NULL,
            week INTEGER NOT NULL,
            period_date DATE NOT NULL,
            sales_amount NUMERIC(15,2) NOT NULL,
            sales_quantity INTEGER,
            average_ticket NUMERIC(10,2),
            growth_percentage NUMERIC(5,2),
            market_share NUMERIC(5,2),
            previous_sales_amount NUMERIC(15,2),
            department_sales_amount NUMERIC(15,2),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (supplier_id, year, week)
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_supplier_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            sku_code TEXT NOT NULL,
            product_name TEXT NOT NULL,
            category TEXT,
            department TEXT,
            price NUMERIC(10,2),
            sell_through_rate NUMERIC(5,2),
            rotation_speed TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, sku_code)
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_product_sales (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            product_id UUID REFERENCES template_schema.trade_supplier_products(id),
            supplier_id UUID REFERENCES template_schema.trade_suppliers(id),
            year INTEGER NOT NULL,
            week INTEGER NOT NULL,
            sales_amount NUMERIC(15,2),
            sales_quantity INTEGER,
            profit_margin NUMERIC(5,2),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_supplier_insights (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            jbp_plan_id UUID REFERENCES template_schema.trade_jbp_plans(id),
            insight_type TEXT,
            title TEXT,
            message TEXT,
            action TEXT,
            priority TEXT,
            confidence NUMERIC(3,2),
            data_points JSONB,
            is_actionable BOOLEAN DEFAULT TRUE,
            expected_impact TEXT,
            timeline TEXT,
            score NUMERIC(6,3),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ,
            status TEXT DEFAULT 'active'
        );

        CREATE TABLE IF NOT EXISTS template_schema.trade_roi_calculations (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL,
            supplier_id UUID NOT NULL REFERENCES template_schema.trade_suppliers(id),
            jbp_plan_id UUID REFERENCES template_schema.trade_jbp_plans(id),
            period_start DATE,
            period_end DATE,
            basic_roi JSONB,
            incremental_roi JSONB,
            causality_confidence JSONB,
            calculation_data JSONB,
            version INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS template_schema.trade_roi_calculations CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_supplier_insights CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_product_sales CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_supplier_products CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_supplier_sales CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_jbp_plans CASCADE;
        DROP TABLE IF EXISTS template_schema.trade_suppliers CASCADE;
        """
    )
