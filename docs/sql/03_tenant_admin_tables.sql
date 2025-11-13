-- Golden Schema: platform brain (tenant_admin)
-- Tables used to administer tenants, users, and metadata

-- Tenants registry
CREATE TABLE IF NOT EXISTS tenant_admin.tb_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT NOT NULL,
    schema_name TEXT NOT NULL UNIQUE,
    google_integration_enabled BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- All users across all tenants
CREATE TABLE IF NOT EXISTS tenant_admin.tb_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    perfil TEXT NOT NULL -- e.g., 'VENDEDOR', 'GERENTE', 'SUPER_ADMIN'
);

-- Meta objects catalog
CREATE TABLE IF NOT EXISTS tenant_admin.tb_meta_objeto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_criador_id UUID NOT NULL REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE,
    nome_tecnico TEXT NOT NULL,
    nome_exibicao TEXT NOT NULL,
    sql_query TEXT NOT NULL,
    tipo_objeto TEXT NOT NULL DEFAULT 'CUSTOMIZADO_SQL',
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'RASCUNHO', 'ARQUIVADO')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_criador_id, nome_tecnico)
);

-- Meta fields for each meta object
CREATE TABLE IF NOT EXISTS tenant_admin.tb_meta_campo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_objeto_id UUID NOT NULL REFERENCES tenant_admin.tb_meta_objeto(id) ON DELETE CASCADE,
    nome_coluna_db TEXT NOT NULL,
    nome_exibicao TEXT NOT NULL,
    tipo_dado TEXT NOT NULL DEFAULT 'TEXTO',
    visivel_na_tabela BOOLEAN DEFAULT TRUE,
    permite_filtro BOOLEAN DEFAULT TRUE
);

-- Permissions per meta object
CREATE TABLE IF NOT EXISTS tenant_admin.tb_meta_permissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_objeto_id UUID NOT NULL REFERENCES tenant_admin.tb_meta_objeto(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_admin.tb_tenant(id) ON DELETE CASCADE,
    perfil_usuario TEXT NOT NULL,
    permissao TEXT NOT NULL DEFAULT 'READ' CHECK (permissao IN ('READ', 'WRITE')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meta_objeto_id, tenant_id, perfil_usuario, permissao)
);

CREATE INDEX IF NOT EXISTS idx_meta_permissoes_lookup
    ON tenant_admin.tb_meta_permissao (tenant_id, perfil_usuario, permissao);

