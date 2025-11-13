import AppShell from "@/components/layout/AppShell";
import WidgetLoader from "@/components/widgets/WidgetLoader";

type Opportunity = {
  id: string;
  nome: string;
  stage: string;
  valor: number;
  probabilidade: number;
  owner: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

async function fetchOpportunities(): Promise<Opportunity[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/vendas/oportunidades`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function VendasPage() {
  const opportunities = await fetchOpportunities();

  return (
    <AppShell>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Modulo de Vendas</p>
          <h2>Execucao do funil comercial</h2>
          <p className="muted">
            Combine a lista operacional com os widgets publicados pela Area de Dados para ter contexto do funil na mesma tela.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button">Importar leads</button>
          <button className="primary-button">Nova oportunidade</button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetLoader
          targetModule="MOD_VENDAS"
          title="Painel customizado do modulo"
          description="Publicacoes feitas no Relatorios e BI com destino MOD_VENDAS chegam aqui automaticamente."
        />

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Visao operacional</p>
              <h3>Oportunidades recentes</h3>
            </div>
            <button className="ghost-button small">Ver funil completo</button>
          </div>
          <div className="space-y-3">
            {opportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3"
              >
                <div>
                  <strong className="text-white">{opportunity.nome}</strong>
                  <p className="text-xs text-gray-400">{opportunity.owner}</p>
                </div>
                <div className="text-right">
                  <span className="badge">{opportunity.stage}</span>
                  <p className="text-white font-semibold">{currency.format(opportunity.valor)}</p>
                </div>
              </article>
            ))}
            {!opportunities.length && (
              <p className="text-sm text-gray-400">Nenhuma oportunidade cadastrada ainda.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

