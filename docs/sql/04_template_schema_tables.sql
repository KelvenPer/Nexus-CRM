-- Template schema (library) with the base tables only (no data)

-- Contacts
CREATE TABLE IF NOT EXISTS template_schema.tb_contato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    owner_id UUID,
    nome_completo TEXT NOT NULL,
    email TEXT,
    cargo TEXT,
    conta_id UUID,
    status_lead TEXT DEFAULT 'NOVO' CHECK (status_lead IN ('NOVO', 'QUALIFICADO', 'DESATIVADO')),
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities
CREATE TABLE IF NOT EXISTS template_schema.tb_oportunidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    owner_id UUID,
    nome_oportunidade TEXT NOT NULL,
    valor_estimado NUMERIC(15, 2) DEFAULT 0,
    estagio_funil TEXT CHECK (estagio_funil IN ('PROSPEC', 'PROPOSTA', 'GANHO', 'PERDIDO')),
    data_fechamento_prevista DATE,
    probabilidade INTEGER CHECK (probabilidade BETWEEN 0 AND 100),
    origem_campanha_id UUID,
    contato_principal_id UUID,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE IF NOT EXISTS template_schema.tb_atividade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    owner_id UUID,
    tipo_atividade TEXT CHECK (tipo_atividade IN ('LIGACAO', 'EMAIL', 'REUNIAO', 'TAREFA')),
    descricao TEXT,
    status TEXT CHECK (status IN ('PENDENTE', 'COMPLETO', 'CANCELADO')),
    data_vencimento TIMESTAMPTZ,
    related_oportunidade_id UUID,
    related_contato_id UUID,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Recommended indexes in tenant clones (will be recreated per-tenant)
-- Here only documented; cloning script will create indexes per tenant

