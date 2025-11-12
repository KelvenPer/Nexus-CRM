-- Nexus CRM - Base schemas for tenant-provisioned databases
-- Each tenant receives its own schema (e.g., tenant_supermercado_lima).
-- Even with schema isolation, every record carries tenant_id for RLS and auditing guarantees.

-------------------------------
-- 1) tb_contato
-------------------------------
CREATE TABLE IF NOT EXISTS tb_contato (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    owner_id            UUID NOT NULL,
    nome_completo       TEXT NOT NULL,
    email               TEXT UNIQUE,
    cargo               TEXT,
    conta_id            UUID,
    status_lead         TEXT DEFAULT 'NOVO',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_conta FOREIGN KEY (conta_id) REFERENCES tb_conta(id),
    CONSTRAINT chk_status_lead CHECK (status_lead IN ('NOVO', 'QUALIFICADO', 'DESATIVADO'))
);


-------------------------------
-- 2) tb_oportunidade
-------------------------------
CREATE TABLE IF NOT EXISTS tb_oportunidade (
    id                       UUID PRIMARY KEY,
    tenant_id                UUID NOT NULL,
    owner_id                 UUID NOT NULL,
    nome_oportunidade        TEXT NOT NULL,
    valor_estimado           NUMERIC(15, 2) NOT NULL,
    estagio_funil            TEXT NOT NULL,
    data_fechamento_prevista DATE,
    probabilidade            INTEGER CHECK (probabilidade BETWEEN 0 AND 100),
    origem_campanha_id       UUID,
    contato_principal_id     UUID REFERENCES tb_contato(id),
    criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_estagio_funil CHECK (
        estagio_funil IN ('PROSPEC', 'PROPOSTA', 'GANHO', 'PERDIDO')
    )
);


-------------------------------
-- 3) tb_atividade
-------------------------------
CREATE TABLE IF NOT EXISTS tb_atividade (
    id                      UUID PRIMARY KEY,
    tenant_id               UUID NOT NULL,
    owner_id                UUID NOT NULL,
    tipo_atividade          TEXT NOT NULL,
    descricao               TEXT,
    status                  TEXT NOT NULL,
    data_vencimento         TIMESTAMPTZ,
    related_oportunidade_id UUID REFERENCES tb_oportunidade(id),
    related_contato_id      UUID REFERENCES tb_contato(id),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tipo_atividade CHECK (
        tipo_atividade IN ('LIGACAO', 'EMAIL', 'REUNIAO', 'TAREFA')
    ),
    CONSTRAINT chk_status_atividade CHECK (
        status IN ('PENDENTE', 'COMPLETO', 'CANCELADO')
    )
);


-------------------------------
-- 4) tb_meta_objeto (schema central tenant_admin)
-------------------------------
CREATE TABLE IF NOT EXISTS tenant_admin.tb_meta_objeto (
    id                UUID PRIMARY KEY,
    nome_tecnico      TEXT NOT NULL UNIQUE,
    nome_exibicao     TEXT NOT NULL,
    tenant_criador_id UUID NOT NULL,
    tipo_objeto       TEXT NOT NULL CHECK (tipo_objeto IN ('BASE', 'CUSTOMIZADO_SQL')),
    sql_query         TEXT NOT NULL,
    descricao         TEXT,
    status            TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'RASCUNHO', 'ARQUIVADO')),
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes recommended for multi-tenant filters and frequent joins:
CREATE INDEX IF NOT EXISTS idx_tb_contato_tenant ON tb_contato (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tb_oportunidade_tenant ON tb_oportunidade (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tb_atividade_tenant ON tb_atividade (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tb_meta_objeto_tenant ON tenant_admin.tb_meta_objeto (tenant_criador_id);

-------------------------------
-- 5) tb_meta_permissoes (schema tenant_admin)
-------------------------------
CREATE TABLE IF NOT EXISTS tenant_admin.tb_meta_permissoes (
    id             UUID PRIMARY KEY,
    meta_objeto_id UUID NOT NULL REFERENCES tenant_admin.tb_meta_objeto(id) ON DELETE CASCADE,
    tenant_id      UUID NOT NULL,
    perfil_usuario TEXT NOT NULL,
    permissao      TEXT NOT NULL CHECK (permissao IN ('READ', 'WRITE')),
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meta_objeto_id, tenant_id, perfil_usuario, permissao)
);

CREATE INDEX IF NOT EXISTS idx_meta_permissoes_lookup
    ON tenant_admin.tb_meta_permissoes (tenant_id, perfil_usuario, permissao);
