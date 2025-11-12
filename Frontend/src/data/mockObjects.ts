import type { Column } from "@/components/data/GenericDataTable";

export const contactColumns: Column[] = [
  { key: "cliente", label: "Cliente" },
  { key: "segmento", label: "Segmento" },
  { key: "status", label: "Status" },
  { key: "ticketMedio", label: "Tiquete Medio" },
];

export const contactRows = [
  {
    cliente: "Supermercado Lima",
    segmento: "Varejo",
    status: "Ativo",
    ticketMedio: "R$ 24k",
  },
  {
    cliente: "Rede Clinic+",
    segmento: "Saude",
    status: "Onboarding",
    ticketMedio: "R$ 12k",
  },
  {
    cliente: "Grupo Aurora",
    segmento: "Industria",
    status: "Expansao",
    ticketMedio: "R$ 31k",
  },
];

export const roadmapPhases = [
  {
    title: "Fase 1 - Fundacao",
    items: [
      "Provisionamento de schemas via FastAPI Alembic",
      "JWT + search_path configurado por tenant",
      "Tabela meta_objetos no schema tenant_admin",
    ],
  },
  {
    title: "Fase 2 - Motor",
    items: [
      "Executor SQL seguro (apenas SELECT)",
      "Tabelas core: contatos, oportunidades, atividades",
      "Endpoints com filtros dinamicos",
    ],
  },
  {
    title: "Fase 3 - Interface",
    items: [
      "GenericDataTable consumindo /api/meta-object",
      "Playground para salvar visores",
      "Layout multi-modulos para clientes",
    ],
  },
];

export const defaultSqlSnippet = `
SELECT c.nome as cliente,
       o.status,
       o.valor_total,
       a.ultima_interacao
  FROM tb_contato c
  JOIN tb_oportunidade o ON o.contato_id = c.id
  LEFT JOIN tb_atividade a ON a.oportunidade_id = o.id
 WHERE o.status IN ('Aberta', 'Proposta')
 ORDER BY a.ultima_interacao DESC;
`;

export const metaObjectColumns: Column[] = [
  { key: "nomeAmigavel", label: "Nome Amigável" },
  { key: "idObjeto", label: "ID do Objeto" },
  { key: "tipo", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "perfis", label: "Perfis de Acesso" },
  { key: "acoes", label: "Ações" },
];

export const metaObjectRows = [
  {
    nomeAmigavel: "Oportunidades Ativas",
    idObjeto: "tb_oportunidade",
    tipo: "BASE",
    status: "Ativo",
    perfis: "Vendas, Diretoria",
    acoes: "Editar Permissões",
  },
  {
    nomeAmigavel: "Contatos da Região Sudeste",
    idObjeto: "obj_contatos_sudeste",
    tipo: "CUSTOMIZADO",
    status: "Ativo",
    perfis: "Vendas",
    acoes: "Editar Permissões Excluir",
  },
  {
    nomeAmigavel: "Vendas por Campanha de Marketing",
    idObjeto: "obj_vendas_campanha",
    tipo: "CUSTOMIZADO",
    status: "Ativo",
    perfis: "Marketing, Diretoria",
    acoes: "Editar Permissões Excluir",
  },
  {
    nomeAmigavel: "Leads Qualificados (MQL)",
    idObjeto: "obj_leads_mql",
    tipo: "CUSTOMIZADO",
    status: "Rascunho",
    perfis: "Marketing",
    acoes: "Editar Permissões Excluir",
  },
  {
    nomeAmigavel: "Catálogo de Produtos",
    idObjeto: "tb_produto",
    tipo: "BASE",
    status: "Ativo",
    perfis: "Vendas, Marketing, Diretoria",
    acoes: "Editar Permissões",
  },
];

export const userProfiles = [
  { id: "vendas", name: "Vendas" },
  { id: "diretoria", name: "Diretoria" },
  { id: "marketing", name: "Marketing" },
  { id: "suporte", name: "Suporte" },
  { id: "financeiro", name: "Financeiro" },
];

