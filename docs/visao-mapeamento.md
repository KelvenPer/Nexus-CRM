Temos uma base sólida com o ciclo Criar -> Gerenciar -> Consumir. Os líderes de mercado (Salesforce, Microsoft Dynamics/Power BI, e plataformas de BI puro como Looker e Alteryx) não se destacam apenas por terem esses módulos; eles se destacam pela profundidade da integração e automação entre eles.

Para elevar o Nexus CRM de uma ferramenta flexível para uma plataforma robusta e líder de mercado, proponho a evolução do nosso MVP para o Nexus Data Engine 2.0.

Abaixo está o mapeamento de aprimoramento focado em robustez e modularidade.

# 🗺️ Mapeamento de Aprimoramento: Nexus Data Engine 2.0

Nossa base atual é boa, mas para vencermos, precisamos introduzir três conceitos-chave dos líderes: Visual ETL (Alteryx), Business Logic Centralizada (Looker/LookML) e BI Acionável (Salesforce/Power BI).

## 1. Evolução do "Estúdio SQL" (Cria o Dado)

- **Status Atual (MVP):** Um editor SQL para Admins escreverem SELECT e salvarem como Objetos.
- **Problema:** Depende 100% do Admin saber SQL. Não permite cruzar com dados externos facilmente.
- **Visão 2.0:** O "Estúdio de Preparação de Dados" (Data Prep Studio)

| Inovação (O que desenvolver) | Diferencial (Por que faremos isso) |
|---|---|
| **A. Construtor Visual de Joins (Visual ETL)** | Em vez de apenas código, o Admin pode arrastar a tb_oportunidade e a tb_campanha para uma tela, desenhar uma linha entre elas e aplicar um bloco de "Filtro". O sistema gera o SQL automaticamente. Isso é 10x mais rápido e acessível (modelo Alteryx). |
| **B. Conectores de Dados Externos (Data Connectors)** | O Admin poderá, no Estúdio, registrar uma fonte de dados externa (Ex: um banco de dados de um ERP, um Google BigQuery). |
| **C. Versionamento de Query** | Cada "Objeto Customizado" salvo no Estúdio SQL terá um histórico de versões (Git-like). |

## 2. Evolução dos "Metadados" (Gerencia o Dado)

- **Status Atual (MVP):** Um catálogo de Objetos e suas permissões de acesso (quem vê).
- **Problema:** O usuário do BI (Gerente) ainda precisa saber como usar o Objeto (Ex: ele precisa saber que "Receita" é SUM(valor_estimado)).
- **Visão 2.0:** O "Catálogo de Métricas de Negócio" (Business Logic Hub)

| Inovação (O que desenvolver) | Diferencial (Por que faremos isso) |
|---|---|
| **A. Definição Central de Métricas** | Ao salvar o Objeto, o Admin não salva só o SQL. Ele define as Métricas dele. Ex: Ele define a Métrica "Receita Total" como SUM(valor_estimado) e "Taxa de Conversão" como COUNT(DISTINCT id_ganho) / COUNT(DISTINCT id_total). |
| **B. Mapa de Linhagem de Dados (Data Lineage)** | Uma tela gráfica que mostra o fluxo: (Dados Externos) -> (Tabelas Base) -> (Objetos Customizados) -> (Quais Relatórios de BI usam isso). |
| **C. Dicionário de Dados Amigável** | Além de gerenciar o acesso, o Admin poderá escrever uma descrição (Ex: "Nome Amigável: Valor da Venda", "Descrição: Valor total da oportunidade em Reais..."). |

## 3. Evolução dos "Relatórios e BI" (Consome o Dado)

- **Status Atual (MVP):** Um construtor No-Code para criar gráficos e dashboards (visualização).
- **Problema:** O usuário vê o dado, mas não pode agir sobre ele. Ele precisa voltar para a tela de Vendas.
- **Visão 2.0:** O "BI Acionável" (Actionable BI)

| Inovação (O que desenvolver) | Diferencial (Por que faremos isso) |
|---|---|
| **A. Ações de "Drill-Down" e "Write-Back"** | O usuário vê um gráfico de "Oportunidades Atrasadas". Ele clica na barra do gráfico, e o sistema mostra a lista (drill-down). Ao lado de cada item da lista, há um botão "Criar Tarefa de Follow-up". |
| **B. Gatilhos de Automação (Data-Driven Workflows)** | O usuário cria um KPI Card: "Novos Leads Hoje". Ele anexa um Gatilho: "SE este valor for > 50, ENTÃO enviar um Slack para o canal #vendas". |
| **C. Exportação e Agendamento** | O usuário pode agendar um Dashboard para ser enviado (PDF ou CSV) toda segunda-feira às 8h para a Diretoria. |

## Mapeamento 2.0 (Resumo)

Este é o nosso novo fluxo de desenvolvimento para garantir a liderança de mercado do Nexus CRM:

1.  **Estúdio de Preparação de Dados:** Foco em Visual ETL e Conectores Externos.
2.  **Catálogo de Métricas:** Foco em Métricas Centralizadas e Linhagem de Dados.
3.  **BI Acionável:** Foco em Ações de Write-Back e Gatilhos de Automação.

Essa arquitetura não apenas nos dá flexibilidade, mas nos torna a plataforma central de inteligência do cliente, conectando o CRM ao ERP e automatizando as ações.

## 4. Estrutura física das tabelas (Passo 2.2)

Para viabilizar o ciclo Estúdio SQL → Metadados → Relatórios, cada tenant recebe três tabelas estratégicas (ver `docs/sql/base_tables.sql`):

- **tb_contato** – Pessoas com quem interagimos. Possui `tenant_id`, `owner_id`, `status_lead` e FK opcional para `tb_conta`.
- **tb_oportunidade** – Negócios em andamento. Inclui `valor_estimado`, `estagio_funil`, `probabilidade`, dados de previsão e relacionamentos com campanha/contato.
- **tb_atividade** – Interações e rastreabilidade. Classifica o tipo (`LIGACAO`, `EMAIL`, `REUNIAO`, `TAREFA`), controla status e conecta a contatos/oportunidades.

Cada tabela carrega `tenant_id`, `criado_em`, `atualizado_em` e `owner_id` para permitir RLS, auditoria e automações.

### Catálogo global: `tenant_admin.tb_meta_objeto`

No schema central mantemos o catálogo de objetos consumidos pelos módulos No-Code. Campos principais:

- `nome_tecnico` (único) + `sql_query`: definem o SELECT seguro que o Estúdio SQL salvou.
- `tenant_criador_id` e `tipo_objeto` (`BASE` ou `CUSTOMIZADO_SQL`) preservam o ownership.
- `status` controla publicação (`ATIVO`, `RASCUNHO`, `ARQUIVADO`).

Com isso:
1. O Estúdio SQL valida a consulta (Passo 2.1) e salva uma linha na `tb_meta_objeto`.
2. Relatórios/BI listam objetos ativos consultando o catálogo.
3. A execução final busca a `sql_query`, injeta filtros por `tenant_id` e executa em cima das tabelas base.

O próximo passo é modelar `tb_meta_permissoes` para atrelar cada objeto a perfis de usuário.

### Governança: `tenant_admin.tb_meta_permissoes`

Tabela N:M que liga objetos a perfis/tenants:

- `meta_objeto_id` → FK para o catálogo.
- `tenant_id` → escopo da regra (mesmo que o objeto seja global).
- `perfil_usuario` + `permissao` (`READ`/`WRITE`) → define o nível de acesso.

Fluxo:
1. Admin cria o objeto no Estúdio SQL (`tb_meta_objeto`).
2. Na tela de Metadados ele marca perfis; cada marcação gera ou remove linhas em `tb_meta_permissoes`.
3. Quando o frontend pede `/api/v1/dados/meta-objetos/disponiveis`, o backend filtra por tenant/perfil usando essa tabela e retorna apenas o que o usuário pode consumir.

Isso garante que perfis como *VENDEDOR* não enxerguem objetos de *DIRETORIA*, mesmo estando no mesmo banco.
