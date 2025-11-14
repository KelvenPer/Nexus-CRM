"""crm schema for tenant_admin and template_schema alignment"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251114_000001"
down_revision = "20251113_213000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure schemas exist
    op.execute("CREATE SCHEMA IF NOT EXISTS tenant_admin")
    op.execute("CREATE SCHEMA IF NOT EXISTS template_schema")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # -------------------- tenant_admin core: tb_tenant/tb_usuario --------------------
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='tenant_admin' AND table_name='tb_tenant'
          ) THEN
            CREATE TABLE tenant_admin.tb_tenant (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              slug TEXT UNIQUE,
              nome_fantasia TEXT,
              razao_social TEXT,
              cnpj VARCHAR(14),
              schema_name TEXT NOT NULL UNIQUE,
              plano TEXT,
              status TEXT NOT NULL DEFAULT 'ATIVO',
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
          ELSE
            -- Add/align columns
            ALTER TABLE tenant_admin.tb_tenant
              ADD COLUMN IF NOT EXISTS slug TEXT,
              ADD COLUMN IF NOT EXISTS nome_fantasia TEXT,
              ADD COLUMN IF NOT EXISTS razao_social TEXT,
              ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14),
              ADD COLUMN IF NOT EXISTS plano TEXT,
              ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO',
              ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
          END IF;
          -- Backfill display name if applicable
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='tenant_admin' AND table_name='tb_tenant' AND column_name='nome_empresa'
          ) THEN
            UPDATE tenant_admin.tb_tenant
              SET nome_fantasia = COALESCE(nome_fantasia, nome_empresa)
              WHERE nome_fantasia IS NULL;
          END IF;
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='tenant_admin' AND table_name='tb_usuario'
          ) THEN
            CREATE TABLE tenant_admin.tb_usuario (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id UUID NOT NULL REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE,
              nome TEXT NOT NULL,
              email TEXT NOT NULL,
              senha_hash TEXT NOT NULL,
              perfil TEXT NOT NULL,
              ativo BOOLEAN NOT NULL DEFAULT TRUE,
              ultimo_login_at TIMESTAMPTZ,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE(tenant_id, email)
            );
          ELSE
            ALTER TABLE tenant_admin.tb_usuario
              ADD COLUMN IF NOT EXISTS nome TEXT,
              ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS ultimo_login_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            -- Ensure composite unique (tenant_id, email)
            BEGIN
              ALTER TABLE tenant_admin.tb_usuario DROP CONSTRAINT IF EXISTS tb_usuario_email_key;
            EXCEPTION WHEN OTHERS THEN END;
            BEGIN
              ALTER TABLE tenant_admin.tb_usuario ADD CONSTRAINT tb_usuario_tenant_email_key UNIQUE (tenant_id, email);
            EXCEPTION WHEN OTHERS THEN END;
          END IF;
        END$$;
        """
    )

    # -------------------- RBAC: add tenant_id to roles (non-breaking) --------------------
    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('tenant_admin.roles') IS NOT NULL THEN
            ALTER TABLE tenant_admin.roles
              ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE;
            -- Replace unique(name) with unique(tenant_id, name) if possible
            BEGIN
              ALTER TABLE tenant_admin.roles DROP CONSTRAINT IF EXISTS roles_name_key;
            EXCEPTION WHEN OTHERS THEN END;
            BEGIN
              ALTER TABLE tenant_admin.roles ADD CONSTRAINT roles_tenant_name_key UNIQUE(tenant_id, name);
            EXCEPTION WHEN OTHERS THEN END;
          END IF;
        END$$;
        """
    )

    # -------------------- Meta-objetos: align/extend existing tables --------------------
    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('tenant_admin.tb_meta_objeto') IS NULL THEN
            CREATE TABLE tenant_admin.tb_meta_objeto (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id UUID NOT NULL REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE,
              nome_interno TEXT NOT NULL,
              label TEXT NOT NULL,
              descricao TEXT,
              sql_definicao TEXT NOT NULL,
              config_visual JSONB,
              ativo BOOLEAN NOT NULL DEFAULT TRUE,
              created_by UUID REFERENCES tenant_admin.tb_usuario(id),
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ
            );
          ELSE
            ALTER TABLE tenant_admin.tb_meta_objeto
              ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE,
              ADD COLUMN IF NOT EXISTS nome_interno TEXT,
              ADD COLUMN IF NOT EXISTS label TEXT,
              ADD COLUMN IF NOT EXISTS sql_definicao TEXT,
              ADD COLUMN IF NOT EXISTS config_visual JSONB,
              ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES tenant_admin.tb_usuario(id),
              ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
          END IF;
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('tenant_admin.tb_meta_campo') IS NULL THEN
            CREATE TABLE tenant_admin.tb_meta_campo (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              meta_objeto_id UUID NOT NULL REFERENCES tenant_admin.tb_meta_objeto(id) ON DELETE CASCADE,
              nome_campo TEXT NOT NULL,
              label TEXT NOT NULL,
              tipo TEXT NOT NULL,
              ordem INT NOT NULL DEFAULT 0,
              config_extra JSONB
            );
          ELSE
            ALTER TABLE tenant_admin.tb_meta_campo
              ADD COLUMN IF NOT EXISTS nome_campo TEXT,
              ADD COLUMN IF NOT EXISTS label TEXT,
              ADD COLUMN IF NOT EXISTS tipo TEXT,
              ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0,
              ADD COLUMN IF NOT EXISTS config_extra JSONB;
          END IF;
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('tenant_admin.tb_meta_permissao') IS NULL THEN
            CREATE TABLE tenant_admin.tb_meta_permissao (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              meta_objeto_id UUID NOT NULL REFERENCES tenant_admin.tb_meta_objeto(id) ON DELETE CASCADE,
              role_id UUID NOT NULL REFERENCES tenant_admin.roles(role_id) ON DELETE CASCADE,
              pode_listar BOOLEAN NOT NULL DEFAULT TRUE,
              pode_ver_detalhe BOOLEAN NOT NULL DEFAULT TRUE,
              pode_exportar BOOLEAN NOT NULL DEFAULT FALSE,
              UNIQUE(meta_objeto_id, role_id)
            );
          ELSE
            -- Extend legacy to support role-based flags
            ALTER TABLE tenant_admin.tb_meta_permissao
              ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES tenant_admin.roles(role_id) ON DELETE CASCADE,
              ADD COLUMN IF NOT EXISTS pode_listar BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS pode_ver_detalhe BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS pode_exportar BOOLEAN NOT NULL DEFAULT FALSE;
          END IF;
        END$$;
        """
    )

    # -------------------- template_schema: CRM tables --------------------
    # Accounts
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_conta (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          documento VARCHAR(18),
          tipo TEXT,
          segmento TEXT,
          telefone TEXT,
          email TEXT,
          website TEXT,
          cidade TEXT,
          estado TEXT,
          pais TEXT,
          owner_id UUID,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )

    # Contacts (align/extend existing)
    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('template_schema.tb_contato') IS NULL THEN
            CREATE TABLE template_schema.tb_contato (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              conta_id UUID REFERENCES template_schema.tb_conta(id) ON DELETE SET NULL,
              nome TEXT NOT NULL,
              email TEXT,
              telefone TEXT,
              cargo TEXT,
              origem TEXT,
              status_lead TEXT,
              owner_id UUID,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ
            );
          ELSE
            -- Rename legacy columns where present
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_contato' AND column_name='nome_completo') THEN
              ALTER TABLE template_schema.tb_contato RENAME COLUMN nome_completo TO nome;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_contato' AND column_name='telefone') THEN
              ALTER TABLE template_schema.tb_contato ADD COLUMN telefone TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_contato' AND column_name='origem') THEN
              ALTER TABLE template_schema.tb_contato ADD COLUMN origem TEXT;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_contato' AND column_name='criado_em') THEN
              ALTER TABLE template_schema.tb_contato RENAME COLUMN criado_em TO created_at;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_contato' AND column_name='atualizado_em') THEN
              ALTER TABLE template_schema.tb_contato RENAME COLUMN atualizado_em TO updated_at;
            END IF;
            -- Conta link
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_contato' AND column_name='conta_id') THEN
              ALTER TABLE template_schema.tb_contato ADD COLUMN conta_id UUID REFERENCES template_schema.tb_conta(id) ON DELETE SET NULL;
            END IF;
          END IF;
        END$$;
        """
    )

    # Leads (create without FK to campanha; link FK after campanha is created)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_lead (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contato_id UUID REFERENCES template_schema.tb_contato(id) ON DELETE CASCADE,
          campanha_id UUID,
          status TEXT NOT NULL,
          origem TEXT,
          score INT,
          owner_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )

    # Opportunities (align/extend existing)
    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('template_schema.tb_oportunidade') IS NULL THEN
            CREATE TABLE template_schema.tb_oportunidade (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              conta_id UUID REFERENCES template_schema.tb_conta(id) ON DELETE CASCADE,
              contato_principal_id UUID REFERENCES template_schema.tb_contato(id),
              nome TEXT NOT NULL,
              estagio TEXT NOT NULL,
              valor NUMERIC(18,2) NOT NULL DEFAULT 0,
              probabilidade INT,
              data_fechamento_prevista DATE,
              fonte TEXT,
              owner_id UUID,
              pipeline TEXT,
              status TEXT NOT NULL DEFAULT 'aberta',
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ
            );
          ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='nome_oportunidade') THEN
              ALTER TABLE template_schema.tb_oportunidade RENAME COLUMN nome_oportunidade TO nome;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='valor_estimado') THEN
              ALTER TABLE template_schema.tb_oportunidade RENAME COLUMN valor_estimado TO valor;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='estagio_funil') THEN
              ALTER TABLE template_schema.tb_oportunidade RENAME COLUMN estagio_funil TO estagio;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='fonte') THEN
              ALTER TABLE template_schema.tb_oportunidade ADD COLUMN fonte TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='pipeline') THEN
              ALTER TABLE template_schema.tb_oportunidade ADD COLUMN pipeline TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='status') THEN
              ALTER TABLE template_schema.tb_oportunidade ADD COLUMN status TEXT NOT NULL DEFAULT 'aberta';
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='criado_em') THEN
              ALTER TABLE template_schema.tb_oportunidade RENAME COLUMN criado_em TO created_at;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_oportunidade' AND column_name='atualizado_em') THEN
              ALTER TABLE template_schema.tb_oportunidade RENAME COLUMN atualizado_em TO updated_at;
            END IF;
          END IF;
        END$$;
        """
    )

    # Products
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_produto (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku TEXT,
          nome TEXT NOT NULL,
          categoria TEXT,
          descricao TEXT,
          preco_lista NUMERIC(18,2),
          unidade TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )

    # Opportunity items
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_oportunidade_produto (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          oportunidade_id UUID NOT NULL REFERENCES template_schema.tb_oportunidade(id) ON DELETE CASCADE,
          produto_id UUID NOT NULL REFERENCES template_schema.tb_produto(id),
          quantidade NUMERIC(18,2) NOT NULL DEFAULT 1,
          preco_unitario NUMERIC(18,2) NOT NULL,
          desconto NUMERIC(5,2) DEFAULT 0,
          total NUMERIC(18,2) NOT NULL,
          UNIQUE (oportunidade_id, produto_id)
        )
        """
    )

    # Activities (align/extend existing)
    op.execute(
        """
        DO $$
        BEGIN
          IF to_regclass('template_schema.tb_atividade') IS NULL THEN
            CREATE TABLE template_schema.tb_atividade (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              tipo TEXT NOT NULL,
              assunto TEXT NOT NULL,
              descricao TEXT,
              status TEXT NOT NULL,
              data_inicio TIMESTAMPTZ,
              data_vencimento TIMESTAMPTZ,
              owner_id UUID,
              relacionado_tipo TEXT,
              relacionado_id UUID,
              resultado TEXT,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ
            );
          ELSE
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='tipo_atividade') THEN
              ALTER TABLE template_schema.tb_atividade RENAME COLUMN tipo_atividade TO tipo;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='assunto') THEN
              ALTER TABLE template_schema.tb_atividade ADD COLUMN assunto TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='descricao') THEN
              ALTER TABLE template_schema.tb_atividade ADD COLUMN descricao TEXT;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='criado_em') THEN
              ALTER TABLE template_schema.tb_atividade RENAME COLUMN criado_em TO created_at;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='atualizado_em') THEN
              ALTER TABLE template_schema.tb_atividade RENAME COLUMN atualizado_em TO updated_at;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='data_inicio') THEN
              ALTER TABLE template_schema.tb_atividade ADD COLUMN data_inicio TIMESTAMPTZ;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='relacionado_tipo') THEN
              ALTER TABLE template_schema.tb_atividade ADD COLUMN relacionado_tipo TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='relacionado_id') THEN
              ALTER TABLE template_schema.tb_atividade ADD COLUMN relacionado_id UUID;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='template_schema' AND table_name='tb_atividade' AND column_name='resultado') THEN
              ALTER TABLE template_schema.tb_atividade ADD COLUMN resultado TEXT;
            END IF;
          END IF;
        END$$;
        """
    )

    # Marketing: campanhas/segmentos and relations
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_campanha (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          tipo TEXT,
          status TEXT NOT NULL,
          canal_principal TEXT,
          objetivo TEXT,
          budget_total NUMERIC(18,2),
          data_inicio DATE,
          data_fim DATE,
          owner_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )
    # Now safely add FK from lead.campanha_id to campanha.id
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints c
            WHERE c.table_schema='template_schema' AND c.table_name='tb_lead' AND c.constraint_type='FOREIGN KEY'
          ) THEN
            ALTER TABLE template_schema.tb_lead
              ADD CONSTRAINT fk_lead_campanha FOREIGN KEY (campanha_id)
              REFERENCES template_schema.tb_campanha(id);
          END IF;
        END$$;
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_segmento (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          descricao TEXT,
          tipo TEXT,
          regra_filtro JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_campanha_segmento (
          campanha_id UUID NOT NULL REFERENCES template_schema.tb_campanha(id) ON DELETE CASCADE,
          segmento_id UUID NOT NULL REFERENCES template_schema.tb_segmento(id) ON DELETE CASCADE,
          PRIMARY KEY (campanha_id, segmento_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_segmento_contato (
          segmento_id UUID NOT NULL REFERENCES template_schema.tb_segmento(id) ON DELETE CASCADE,
          contato_id UUID NOT NULL REFERENCES template_schema.tb_contato(id) ON DELETE CASCADE,
          PRIMARY KEY (segmento_id, contato_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_campanha_contato (
          campanha_id UUID NOT NULL REFERENCES template_schema.tb_campanha(id) ON DELETE CASCADE,
          contato_id UUID NOT NULL REFERENCES template_schema.tb_contato(id) ON DELETE CASCADE,
          status_envio TEXT,
          ultimo_evento_at TIMESTAMPTZ,
          PRIMARY KEY (campanha_id, contato_id)
        )
        """
    )

    # Automacao
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_automacao_regra (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          descricao TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          trigger_tipo TEXT NOT NULL,
          trigger_config JSONB,
          acao_tipo TEXT NOT NULL,
          acao_config JSONB,
          created_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_automacao_execucao (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          regra_id UUID NOT NULL REFERENCES template_schema.tb_automacao_regra(id) ON DELETE CASCADE,
          contexto_tipo TEXT,
          contexto_id UUID,
          status TEXT NOT NULL,
          mensagem_erro TEXT,
          executado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    # Dashboard/Inicio
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_dashboard_bloco (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chave TEXT NOT NULL,
          titulo TEXT NOT NULL,
          tipo TEXT NOT NULL,
          ordem INT NOT NULL DEFAULT 0,
          config JSONB,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_dashboard_kpi (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bloco_id UUID NOT NULL REFERENCES template_schema.tb_dashboard_bloco(id) ON DELETE CASCADE,
          chave TEXT NOT NULL,
          titulo TEXT NOT NULL,
          tipo TEXT NOT NULL,
          sql_consulta TEXT NOT NULL,
          config JSONB,
          ordem INT NOT NULL DEFAULT 0
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS template_schema.tb_timeline_evento (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tipo TEXT NOT NULL,
          titulo TEXT NOT NULL,
          descricao TEXT,
          origem_tipo TEXT,
          origem_id UUID,
          actor_id UUID,
          data_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def downgrade() -> None:
    # Intentionally non-destructive for existing data. Drop only new tables that are safe.
    for stmt in [
        "template_schema.tb_timeline_evento",
        "template_schema.tb_dashboard_kpi",
        "template_schema.tb_dashboard_bloco",
        "template_schema.tb_automacao_execucao",
        "template_schema.tb_automacao_regra",
        "template_schema.tb_campanha_contato",
        "template_schema.tb_segmento_contato",
        "template_schema.tb_campanha_segmento",
        "template_schema.tb_segmento",
        "template_schema.tb_campanha",
        "template_schema.tb_oportunidade_produto",
        "template_schema.tb_produto",
        "template_schema.tb_lead",
        "template_schema.tb_conta",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {stmt} CASCADE")
