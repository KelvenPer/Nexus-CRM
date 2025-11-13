import AppShell from "@/components/layout/AppShell";
import WidgetLoader from "@/components/widgets/WidgetLoader";

type Campaign = {
  id: string;
  nome: string;
  status: string;
  investimento: number;
  inicio: string;
  fim: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

async function fetchCampaigns(): Promise<Campaign[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/marketing/campanhas`, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function MarketingPage() {
  const campaigns = await fetchCampaigns();

  return (
    <AppShell>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Modulo de Marketing</p>
          <h2>Planejamento e execucao de campanhas</h2>
          <p className="muted">
            Use os widgets publicados para monitorar performance de campanha, enquanto gerencia segmentacoes e workflows.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button">Importar contatos</button>
          <button className="primary-button">Nova campanha</button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <WidgetLoader
          targetModule="MOD_MARKETING"
          title="Painel customizado de Marketing"
          description="Visualizacoes publicadas no Relatorios e BI para o modulo de Marketing."
        />

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Campanhas em foco</p>
              <h3>Pipeline de Marketing</h3>
            </div>
          </div>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white">{campaign.nome}</strong>
                  <span className="badge">{campaign.status}</span>
                </div>
                <p className="text-sm text-gray-400">
                  Investimento: {currency.format(campaign.investimento)}
                </p>
                <p className="text-xs text-gray-500">
                  {campaign.inicio} - {campaign.fim}
                </p>
              </article>
            ))}
            {!campaigns.length && (
              <p className="text-sm text-gray-400">Nenhuma campanha cadastrada no momento.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

