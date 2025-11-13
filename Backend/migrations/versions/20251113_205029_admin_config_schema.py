"""initial admin config schema"""
import os
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251113_205029"
down_revision = None
branch_labels = None
depends_on = None

TENANT_ADMIN = os.environ.get("TENANT_ADMIN_SCHEMA", "tenant_admin")


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {TENANT_ADMIN}")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # RBAC
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.roles (
        role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.permissions (
        permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.role_permissions (
        role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.roles(role_id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.permissions(permission_id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
    )
    """)

    # API Keys / Webhooks
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.api_keys (
        key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        key_hash VARCHAR(255) NOT NULL,
        prefix VARCHAR(10) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        last_used_at TIMESTAMP
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.webhooks (
        webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(100) NOT NULL,
        target_url TEXT NOT NULL,
        secret_key TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
    )
    """)

    # Templates / Notifications
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.templates (
        template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.notification_services (
        service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL UNIQUE,
        credentials JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'INACTIVE'
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.notification_triggers (
        trigger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(100) NOT NULL,
        template_id UUID REFERENCES {TENANT_ADMIN}.templates(template_id) ON DELETE SET NULL,
        description TEXT
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.trigger_channels (
        trigger_channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trigger_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.notification_triggers(trigger_id) ON DELETE CASCADE,
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
    )
    """)

    # SLA
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.sla_policies (
        policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        priority VARCHAR(50) NOT NULL UNIQUE,
        first_response_time_minutes INT,
        solution_time_minutes INT
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.business_hours (
        id SERIAL PRIMARY KEY,
        day_of_week INT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL
    )
    """)

    # Custom data
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.custom_tables (
        table_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.custom_fields (
        field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.custom_tables(table_id) ON DELETE CASCADE,
        field_name VARCHAR(100) NOT NULL,
        field_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT FALSE
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.custom_data_store (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.custom_tables(table_id) ON DELETE CASCADE,
        record_data JSONB NOT NULL,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )
    """)

    # User ? Roles link
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        role_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.roles(role_id) ON DELETE CASCADE,
        UNIQUE(user_id, role_id)
    )
    """)

    # Hierarchies
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.hierarchy_levels (
        level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        position INT DEFAULT 0
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.hierarchy_structure (
        structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        parent_id UUID NULL REFERENCES {TENANT_ADMIN}.hierarchy_structure(structure_id) ON DELETE SET NULL
    )
    """)

    # Workflows
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.workflows (
        workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        model JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        updated_at TIMESTAMP DEFAULT NOW()
    )
    """)

    # Finance
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.finance_budget_types (
        type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL UNIQUE
    )
    """)
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.finance_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL UNIQUE,
        value TEXT
    )
    """)

    # Audit
    op.execute(f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.audit_log (
        log_id BIGSERIAL PRIMARY KEY,
        user_id UUID,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        details JSONB
    )
    """)


def downgrade() -> None:
    # Drop in reverse order to satisfy FKs
    for stmt in [
        "audit_log",
        "finance_rules",
        "finance_budget_types",
        "workflows",
        "hierarchy_structure",
        "hierarchy_levels",
        "user_roles",
        "custom_data_store",
        "custom_fields",
        "custom_tables",
        "business_hours",
        "sla_policies",
        "trigger_channels",
        "notification_triggers",
        "notification_services",
        "templates",
        "webhooks",
        "api_keys",
        "role_permissions",
        "permissions",
        "roles",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {TENANT_ADMIN}." + stmt + " CASCADE")
