"""seed admin config defaults"""
import os
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251113_211500"
down_revision = "20251113_205029"
branch_labels = None
depends_on = None

TENANT_ADMIN = os.environ.get("TENANT_ADMIN_SCHEMA", "tenant_admin")


def upgrade() -> None:
    # Roles
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.roles (name, description)
        VALUES
            ('admin', 'Administrador'),
            ('data_admin', 'Administrador de Dados'),
            ('analista', 'Analista de Dados'),
            ('assistente', 'Assistente de Operacoes'),
            ('visitante', 'Somente leitura')
        ON CONFLICT (name) DO NOTHING
        """
    )

    # Permission: admin.config.manage
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.permissions (action_key, description)
        VALUES ('admin.config.manage', 'Gerenciar configuracoes administrativas')
        ON CONFLICT (action_key) DO NOTHING
        """
    )

    # Grant permission to data_admin
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.role_permissions (role_id, permission_id)
        SELECT r.role_id, p.permission_id
        FROM {TENANT_ADMIN}.roles r, {TENANT_ADMIN}.permissions p
        WHERE lower(r.name) = 'data_admin' AND p.action_key = 'admin.config.manage'
        ON CONFLICT (role_id, permission_id) DO NOTHING
        """
    )

    # SLA business hours (Mon-Fri 08:00-18:00)
    for dow in [1, 2, 3, 4, 5]:
        op.execute(
            f"""
            INSERT INTO {TENANT_ADMIN}.business_hours (day_of_week, start_time, end_time)
            SELECT {dow}, '08:00', '18:00'
            WHERE NOT EXISTS (
                SELECT 1 FROM {TENANT_ADMIN}.business_hours WHERE day_of_week = {dow}
            )
            """
        )

    # SLA policies defaults
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.sla_policies (priority, first_response_time_minutes, solution_time_minutes)
        VALUES
            ('HIGH', 240, 1440),
            ('MEDIUM', 480, 2880),
            ('LOW', 720, 4320)
        ON CONFLICT (priority) DO NOTHING
        """
    )

    # Templates seed
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.templates (name, type, subject, content)
        VALUES
            ('Email: Alerta Vencimento JBP', 'EMAIL', 'JBP proximo do vencimento', '<p>O JBP {{jbp.nome}} vence em 30 dias.</p>')
        ON CONFLICT DO NOTHING
        """
    )

    # Notification trigger seed + channel
    op.execute(
        f"""
        WITH t AS (
          SELECT template_id FROM {TENANT_ADMIN}.templates WHERE name = 'Email: Alerta Vencimento JBP' LIMIT 1
        ), ins AS (
          INSERT INTO {TENANT_ADMIN}.notification_triggers (event_name, template_id, description)
          SELECT 'jbp.vencendo_30d', t.template_id, 'Aviso de vencimento em 30 dias' FROM t
          ON CONFLICT DO NOTHING
          RETURNING trigger_id
        )
        INSERT INTO {TENANT_ADMIN}.trigger_channels (trigger_id, channel, status)
        SELECT (SELECT trigger_id FROM ins LIMIT 1), 'EMAIL', 'ACTIVE'
        ON CONFLICT DO NOTHING
        """
    )

    # Finance defaults
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.finance_budget_types (name)
        VALUES ('Ponto Extra'), ('Desconto Promocional')
        ON CONFLICT (name) DO NOTHING
        """
    )
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.finance_rules (name, value)
        VALUES ('Tolerancia Reconcilicacao', '5%')
        ON CONFLICT (name) DO NOTHING
        """
    )

    # Webhook example
    op.execute(
        f"""
        INSERT INTO {TENANT_ADMIN}.webhooks (event_name, target_url, status)
        VALUES ('jbp.aprovado', 'https://example.com/webhook/jbp', 'INACTIVE')
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    # Non-destructive: clean seeded data
    op.execute(f"DELETE FROM {TENANT_ADMIN}.trigger_channels")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.notification_triggers WHERE event_name = 'jbp.vencendo_30d'")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.templates WHERE name = 'Email: Alerta Vencimento JBP'")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.sla_policies WHERE priority in ('HIGH','MEDIUM','LOW')")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.business_hours WHERE day_of_week BETWEEN 1 AND 5")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.finance_rules WHERE name = 'Tolerancia Reconcilicacao'")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.finance_budget_types WHERE name IN ('Ponto Extra','Desconto Promocional')")
    op.execute(f"DELETE FROM {TENANT_ADMIN}.webhooks WHERE event_name = 'jbp.aprovado'")
    # keep roles/permissions; they are core defaults

