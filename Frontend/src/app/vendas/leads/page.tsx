import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Lead = {
  id: string;
  nome: string;
  email: string;
  status: string;
  origem?: string;
  owner: string;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

async function fetchLeads(): Promise<Lead[]> {
  const data = await fetchJson<Lead[]>("/api/v1/vendas/leads", []);
  return Array.isArray(data) ? data : [];
}

export default async function LeadsPage() {
  const leads = await fetchLeads();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Leads e Prospects</p>
            <h2>Entrada do funil</h2>
            <p className="muted">
              Qualifique rapidamente os leads capturados via inbound, eventos ou imports. Cada linha traz dono, status e
              data de criacao.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar CSV</button>
            <button className="primary-button">Novo lead</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tabela operacional</p>
              <h3>Leads ativos</h3>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.nome}</td>
                    <td className="text-gray-300">{lead.email}</td>
                    <td>{lead.origem ?? "-"}</td>
                    <td>
                      <span className="badge">{lead.status}</span>
                    </td>
                    <td>{lead.owner}</td>
                    <td>{dateFormatter.format(new Date(lead.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads.length && (
              <div className="p-6 text-center text-sm text-gray-400">Nenhum lead cadastrado.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
