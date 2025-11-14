"""seed demo tenant and user (data_admin)"""
import os
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251113_213000"
down_revision = "20251113_211500"
branch_labels = None
depends_on = None

TENANT_ADMIN = os.environ.get("TENANT_ADMIN_SCHEMA", "tenant_admin")


def upgrade() -> None:
    # Ensure pgcrypto for crypt()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # Safe insert tenant if table exists (use proper UUID and unique by schema_name)
    op.execute(
        f"""
    DO $$
    DECLARE has_slug BOOLEAN;
    DECLARE has_nome_fantasia BOOLEAN;
    BEGIN
      IF to_regclass('{TENANT_ADMIN}.tb_tenant') IS NOT NULL THEN
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = '{TENANT_ADMIN}' AND table_name = 'tb_tenant' AND column_name = 'slug'
        ) INTO has_slug;
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = '{TENANT_ADMIN}' AND table_name = 'tb_tenant' AND column_name = 'nome_fantasia'
        ) INTO has_nome_fantasia;

        IF NOT EXISTS (
          SELECT 1 FROM {TENANT_ADMIN}.tb_tenant WHERE schema_name = 'tenant_demo'
        ) THEN
          IF has_slug AND has_nome_fantasia THEN
            INSERT INTO {TENANT_ADMIN}.tb_tenant (id, slug, schema_name, nome_fantasia)
            VALUES (gen_random_uuid(), 'tenant_demo', 'tenant_demo', 'Nexus Demo');
          ELSE
            -- Legacy columns naming
            INSERT INTO {TENANT_ADMIN}.tb_tenant (id, schema_name, nome_empresa)
            VALUES (gen_random_uuid(), 'tenant_demo', 'Nexus Demo');
          END IF;
        END IF;
      END IF;
    END$$;
        """
    )

    # Create demo user with bcrypt hash using pgcrypto's crypt()/gen_salt('bf') if table exists
    op.execute(
        f"""
    DO $$
    DECLARE vtenant UUID;
    BEGIN
      SELECT id INTO vtenant FROM {TENANT_ADMIN}.tb_tenant WHERE schema_name = 'tenant_demo' LIMIT 1;
      IF vtenant IS NULL THEN
        RETURN;
      END IF;
      IF to_regclass('{TENANT_ADMIN}.tb_usuario') IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM {TENANT_ADMIN}.tb_usuario WHERE email = 'admin@nexus.local') THEN
          INSERT INTO {TENANT_ADMIN}.tb_usuario (id, email, senha_hash, perfil, tenant_id)
          VALUES (
            gen_random_uuid(),
            'admin@nexus.local',
            crypt('admin123', gen_salt('bf')),
            'data_admin',
            vtenant
          );
        END IF;
      END IF;
    END$$;
        """
    )

    # Link demo user to data_admin role if both tables exist
    op.execute(f"""
    DO $$
    DECLARE vid UUID;
    DECLARE vrole UUID;
    BEGIN
      IF to_regclass('{TENANT_ADMIN}.tb_usuario') IS NOT NULL THEN
        SELECT id INTO vid FROM {TENANT_ADMIN}.tb_usuario WHERE email = 'admin@nexus.local' LIMIT 1;
      END IF;
      SELECT role_id INTO vrole FROM {TENANT_ADMIN}.roles WHERE lower(name) = 'data_admin' LIMIT 1;
      IF vid IS NOT NULL AND vrole IS NOT NULL THEN
        INSERT INTO {TENANT_ADMIN}.user_roles (id, user_id, role_id)
        VALUES (gen_random_uuid(), vid, vrole)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;
    END$$;
    """)


def downgrade() -> None:
    op.execute(f"""
    DO $$
    DECLARE vid UUID;
    DECLARE vrole UUID;
    BEGIN
      IF to_regclass('{TENANT_ADMIN}.tb_usuario') IS NOT NULL THEN
        SELECT id INTO vid FROM {TENANT_ADMIN}.tb_usuario WHERE email = 'admin@nexus.local' LIMIT 1;
        IF vid IS NOT NULL THEN
          DELETE FROM {TENANT_ADMIN}.user_roles WHERE user_id = vid;
        END IF;
        DELETE FROM {TENANT_ADMIN}.tb_usuario WHERE email = 'admin@nexus.local';
      END IF;
      -- keep tenant row
    END$$;
    """)
