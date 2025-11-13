import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Campaign = {
  id: string;
  nome: string;
  status: string;
  investimento: number;
  inicio: string;
  fim: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

async function fetchCampaigns(): Promise<Campaign[]> {
  const data = await fetchJson<Campaign[]>("/api/v1/marketing/campanhas", []);
  return Array.isArray(data) ? data : [];
}

export default async function CampanhasPage() {
  const campaigns = await fetchCampaigns();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Campanhas</p>
            <h2>Planejamento e resultados</h2>
            <p className="muted">
              Compare status, investimento e janelas de execucao das campanhas do tenant para priorizar otimizacoes.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar midia</button>
            <button className="primary-button">Nova campanha</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Visao tabular</p>
              <h3>Campanhas ativas</h3>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Investimento</th>
                  <th>Periodo</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.nome}</td>
                    <td>
                      <span className="badge">{campaign.status}</span>
                    </td>
                    <td>{currency.format(campaign.investimento)}</td>
                    <td>
                      {campaign.inicio} - {campaign.fim}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!campaigns.length && (
              <div className="p-6 text-center text-sm text-gray-400">Nenhuma campanha cadastrada.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
