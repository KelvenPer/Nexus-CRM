import AppShell from "@/components/layout/AppShell";
import WidgetLoader from "@/components/widgets/WidgetLoader";

type DashboardData = {
  kpiCards: { label: string; value: string; change: string }[];
  funnelStages: { title: string; amount: string; items: number; progress: number; accent: string }[];
  activities: { customer: string; action: string; status: string; badge: string }[];
};

const fallbackKpis = [
  { label: "Receita prevista", value: "R$ 425k", change: "+14% vs meta", icon: "📈", colorClass: "kpi-positive" },
  { label: "Atividades em aberto", value: "18", change: "3 novas reunioes", icon: "📅", colorClass: "kpi-neutral" },
  { label: "Taxa de conversao", value: "62%", change: "+5% na ultima semana", icon: "🎯", colorClass: "kpi-positive" },
  { label: "Alertas", value: "4", change: "2 tickets criticos", icon: "⚠️", colorClass: "kpi-warning" },
];

const fallbackFunnel = [
  { title: "Prospects", amount: "R$ 125.000", items: 32, progress: 0.45, accent: "#00bcd4" },
  { title: "Qualificacao", amount: "R$ 92.400", items: 18, progress: 0.38, accent: "#8bc34a" },
  { title: "Propostas", amount: "R$ 74.800", items: 12, progress: 0.55, accent: "#ffc107" },
  { title: "Fechadas", amount: "R$ 41.300", items: 7, progress: 0.66, accent: "#1a7cb7" },
];

const fallbackActivities = [
  { customer: "Supermercado Lima", action: "Enviar proposta Platinum", status: "Em andamento", badge: "Pipeline" },
  { customer: "Rede Clinic+", action: "Agendar follow-up", status: "Aguardando cliente", badge: "Agenda" },
  { customer: "Grupo Aurora", action: "Revisar metas do trimestre", status: "Planejado", badge: "Estrategia" },
  { customer: "Solida Marketing", action: "Validar objeto customizado", status: "Critico", badge: "Dados" },
];

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

async function fetchDashboardData(): Promise<DashboardData | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/inicio/dashboard/kpis`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  const kpiCards = data?.kpiCards?.length
    ? data.kpiCards.map((kpi, index) => ({
        ...kpi,
        icon: fallbackKpis[index % fallbackKpis.length].icon,
        colorClass: fallbackKpis[index % fallbackKpis.length].colorClass,
      }))
    : fallbackKpis;

  const funnelStages = data?.funnelStages?.length ? data.funnelStages : fallbackFunnel;
  const activities = data?.activities?.length ? data.activities : fallbackActivities;

  return (
    <AppShell>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Painel Inteligente</p>
          <h2>Visao Geral de Vendas</h2>
          <p className="muted">
            Uma visao sintetica do funil, metas e acoes criticas para o tenant ativo. Priorize o que importa e
            monitore alertas.
          </p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button">Relatorios rapidos</button>
          <button className="primary-button">Nova oportunidade</button>
        </div>
      </section>

      <section className="kpi-grid">
        {kpiCards.map((card) => (
          <article key={card.label} className={`kpi-card ${card.colorClass}`}>
            <header>
              <span aria-hidden="true">{card.icon}</span>
              <p className="eyebrow">{card.label}</p>
            </header>
            <strong>{card.value}</strong>
            <p className="muted">{card.change}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-body">
        <article className="pipeline-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Funil de Vendas</p>
              <h3>Pipeline ativo</h3>
            </div>
            <div className="header-buttons">
              <button className="ghost-button small">Filtrar</button>
              <button className="ghost-button small">Exportar</button>
            </div>
          </div>
          <div className="pipeline-grid">
            {funnelStages.map((stage) => (
              <div key={stage.title} className="pipeline-stage">
                <div className="stage-header">
                  <span className="stage-dot" style={{ backgroundColor: stage.accent }} />
                  <strong>{stage.title}</strong>
                </div>
                <p className="stage-amount">{stage.amount}</p>
                <p className="muted">{stage.items} oportunidades</p>
                <div className="stage-progress">
                  <span style={{ width: `${stage.progress * 100}%`, background: stage.accent }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="activities-panel panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Atividades criticas</p>
              <h3>Ultimos movimentos</h3>
            </div>
          </div>
          <div className="activity-list">
            {activities.map((activity) => (
              <div key={`${activity.customer}-${activity.action}`} className="activity-row">
                <div>
                  <strong>{activity.customer}</strong>
                  <p className="muted">{activity.action}</p>
                </div>
                <div className="activity-meta">
                  <span className="badge">{activity.badge}</span>
                  <span className="status-pill">{activity.status}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <WidgetLoader
        targetModule="DASHBOARD_INICIO"
        title="Painel customizado"
        description="Widgets publicados pela Area de Dados aparecem aqui automaticamente."
      />
    </AppShell>
  );
}
