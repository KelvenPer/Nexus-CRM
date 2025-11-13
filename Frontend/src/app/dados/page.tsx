import AppShell from "@/components/layout/AppShell";

const schemaGroups = [
  {
    title: "TABELAS BASE",
    icon: "🗄️",
    count: 83,
    expanded: true,
    items: ["tb_omniato", "tb_oportunidade", "tb_campanha"],
  },
  {
    title: "OBJETOS CUSTOMIZADOS",
    icon: "🧩",
    count: 24,
    expanded: true,
    items: ["sdtvidade", "advhugas", "vsdes"],
  },
];

const queryLines = [
  "SELECT t1.id, t1.nome, t2.valor",
  "  FROM tb_omniato t1",
  "  JOIN tb_oportunidade t2 ON t2.ont_id = t1.id",
  " WHERE t2.status IN ('Aberta', 'Proposta')",
  "   AND t2.tenant_id = current_setting('app.current_tenant')::uuid",
  " ORDER BY t2.ultima_interacao DESC",
];

const resultRows = [
  ["campanha_nome", "valor_estimado", "data_inicio", "status"],
  ["foo_gandara_livre", "20,33", "85", "0"],
  ["valor_estimado", "20,33", "62", "1"],
  ["campanha_nome", "19,29", "89", "1"],
];

const submoduleFocus = [
  {
    title: "Estúdio SQL",
    focus: "Low-Code / Engenharia de dados",
    description:
      "Executor SQL seguro e multi-tenant; transforma consultas complexas em Objetos Customizados que qualquer módulo pode consumir.",
    icon: "🧠",
    highlights: [
      "Editor SQL + árvore de bases e meta_objetos",
      "Validação que bloqueia comandos proibidos (não SELECT)",
      "Salva consultas como meta_objetos com nome amigável",
    ],
  },
  {
    title: "Relatórios e BI",
    focus: "No-Code / Análise de negócios",
    description:
      "Dashboards dinâmicos criados sobre os Objetos customizados; o usuário monta gráficos arrastando campos sem saber SQL.",
    icon: "📊",
    highlights: [
      "Escolhe qualquer objeto (base + custom) como fonte",
      "Cria gráficos por eixo X/Y e agrega valores (soma/média)",
      "Agenda envios automáticos e alertas por KPI",
    ],
  },
  {
    title: "Metadados (Objetos)",
    focus: "Admin / Gerenciamento",
    description:
      "Catálogo centralizado com permissões, colunas e integrações; controla quem consome cada objeto e se APIs externas têm acesso.",
    icon: "🗂️",
    highlights: [
      "Lista completa de meta_objetos com versionamento",
      "Define metadados por coluna (tipo, privacidade, alias)",
      "Configura acessos por perfis e expõe APIs com chaves",
    ],
  },
];

export default function DadosPage() {
  return (
    <AppShell>
      <div className="submodule-overview">
        <div>
          <p className="eyebrow">Área de Dados · Pilar Nexus</p>
          <h1>Centro de Low-Code e gestão de metadados</h1>
          <p className="muted">
            A Área de Dados é o coração do Nexus CRM. O Estúdio SQL entrega a
            engenharia de dados segura, os Relatórios e BI democratizam a análise
            e os Metadados mantêm o catálogo sob controle.
          </p>
        </div>
        <div className="overview-cards">
          {submoduleFocus.map((module) => (
            <article key={module.title}>
              <header>
                <span aria-hidden="true">{module.icon}</span>
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.focus}</p>
                </div>
              </header>
              <p>{module.description}</p>
              <ul>
                {module.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="data-area">
        <section className="data-header">
          <div>
            <div className="brand-label">
              <span role="img" aria-label="Nexus logo">
                🔷
              </span>
              <span>NEXUS CRM</span>
            </div>
            <h1>Editor de Consulta SQL</h1>
            <p className="muted">
              Escreva, valide e salve consultas escoltadas pelo motor do Nexus CRM.
            </p>
          </div>
          <div className="data-actions">
            <button className="ghost-button btn-cyan">Testar consulta</button>
            <button className="primary-button btn-lime">Salvar novo objeto</button>
            <button className="ghost-button">Limpar</button>
          </div>
        </section>

        <div className="data-playground">
          <aside className="schema-panel">
            <div className="schema-title">Explorador de Dados</div>
            {schemaGroups.map((group) => (
              <div key={group.title} className="schema-group">
                <div className="schema-header">
                  <div className="schema-heading">
                    <span className="schema-icon" aria-hidden="true">
                      {group.icon}
                    </span>
                    <strong>{group.title}</strong>
                  </div>
                  <div className="schema-info">
                    <span>{group.count}</span>
                    <span className="schema-arrow" aria-hidden="true">
                      {group.expanded ? "▼" : "▶"}
                    </span>
                  </div>
                </div>
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>
          <section className="query-panel">
            <header className="query-header">
              <div>
                <p className="eyebrow">Regular a consulta (Tempo: 350ms, Linhas: 50)</p>
                <h2>Editor de Consulta SQL</h2>
              </div>
              <span className="badge">SQL</span>
            </header>
            <div className="query-editor">
              <pre>
                {queryLines.map((line) => (
                  <span key={line}>
                    {line}
                    {"\n"}
                  </span>
                ))}
              </pre>
            </div>
            <div className="query-footer">
              <div className="query-state">
                <div className="query-status success">
                  Consulta validada e pronta para execução / salvamento.
                </div>
                <div className="query-alert warning">
                  ⚠️ Comandos proibidos detectados (ALTER/DROP) foram filtrados.
                </div>
              </div>
              <div className="tag-group">
                <span className="ghost-tag">DEFINIR NOME LEGÍVEL</span>
                <span className="ghost-tag">APLICAR FILTROS</span>
              </div>
            </div>
          </section>
        </div>

        <div className="data-result">
          <section className="result-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Área de Resultado</p>
                <h3>Resultado da consulta</h3>
              </div>
              <span className="badge success">Tempo: 350ms</span>
            </div>
            <div className="result-status">
              Resultado da Consulta · Tempo: 350ms · Linhas: 50
            </div>
            <div className="table-wrapper result-table">
              <table>
                <thead>
                  <tr>
                    {resultRows[0].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultRows.slice(1).map((row) => (
                    <tr key={row.join(",")}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="metadata-panel">
            <h3>Metadados do Objeto</h3>
            <div className="metadata-group">
              <label>
                Nome amigável
                <input placeholder="Campanha consolidada" />
              </label>
              <label>
                ID do objeto
                <input placeholder="visor_campanhas" />
              </label>
              <label>
                Descrição
                <textarea rows={3} placeholder="Descrição resumida" />
              </label>
              <button className="primary-button">Confirmar salvamento</button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
