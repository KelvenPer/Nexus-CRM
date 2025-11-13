import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Opportunity = {
  id: string;
  nome: string;
  stage: string;
  valor: number;
  probabilidade: number;
  owner: string;
  updatedAt: string;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

async function fetchOpportunities(): Promise<Opportunity[]> {
  const data = await fetchJson<Opportunity[]>("/api/v1/vendas/oportunidades", []);
  return Array.isArray(data) ? data : [];
}

export default async function OportunidadesPage() {
  const opportunities = await fetchOpportunities();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Oportunidades</p>
            <h2>Pipeline completo</h2>
            <p className="muted">
              Analise valores, fases e probabilidade de ganho das oportunidades em andamento. Filtre por stage e
              exporte para BI.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Filtrar</button>
            <button className="primary-button">Registrar progresso</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Funil comercial</p>
              <h3>Oportunidades por stage</h3>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Oportunidade</th>
                  <th>Stage</th>
                  <th>Valor</th>
                  <th>Probabilidade</th>
                  <th>Owner</th>
                  <th>Ultima atualizacao</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.id}>
                    <td>{opportunity.nome}</td>
                    <td>
                      <span className="badge">{opportunity.stage}</span>
                    </td>
                    <td>{currency.format(opportunity.valor)}</td>
                    <td>{Math.round(opportunity.probabilidade * 100)}%</td>
                    <td>{opportunity.owner}</td>
                    <td>{new Date(opportunity.updatedAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!opportunities.length && (
              <div className="p-6 text-center text-sm text-gray-400">Nenhuma oportunidade aberta.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
