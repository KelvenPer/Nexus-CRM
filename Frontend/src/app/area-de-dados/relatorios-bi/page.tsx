 "use client";

 import { useEffect, useState } from "react";
 import { useRouter } from "next/navigation";
 import AppShell from "@/components/layout/AppShell";

 type DashboardSummary = {
  id: string;
  title: string;
  description?: string;
  widgetsCount?: number;
  updatedAt?: string;
 };

const fallbackDashboards: DashboardSummary[] = [
  {
    id: "vendas-funil",
    title: "Visão de Vendas e Funil",
    description: "Monitoramento em tempo real das oportunidades mais quentes do tenant.",
    widgetsCount: 4,
    updatedAt: "2025-11-08T12:10:00.000Z",
  },
  {
    id: "marketing-performance",
    title: "Performance de Marketing",
    description: "Acompanhamento de campanhas e conversões com KPIs claros.",
    widgetsCount: 3,
    updatedAt: "2025-11-07T16:45:00.000Z",
  },
  {
    id: "metas-participacao",
    title: "Metas x Participação",
    description: "Dashboard tático para alinhar a equipe com as metas trimestrais.",
    widgetsCount: 5,
    updatedAt: "2025-11-04T09:20:00.000Z",
  },
];

export default function RelatoriosBiPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadDashboards() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/v1/dashboards");
        if (!response.ok) {
          throw new Error("Falha na requisição");
        }
      const data = await response.json();
      if (!isActive) return;
      const list: DashboardSummary[] = Array.isArray(data)
        ? data
        : Array.isArray(data.dashboards)
        ? data.dashboards
        : [];
      setDashboards(list);
        setError("");
      } catch (fetchError) {
        console.error(fetchError);
        if (!isActive) return;
        setDashboards(fallbackDashboards);
        setError("Não foi possível carregar os dashboards salvos.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDashboards();
    return () => {
      isActive = false;
    };
  }, []);

  const handleCreate = () => {
    router.push("/area-de-dados/construtor/novo");
  };

  return (
    <AppShell>
      <section className="reports-hero">
        <div>
          <p className="eyebrow">Meus relatórios e dashboards</p>
          <h1>Catálogo de insights do seu tenant</h1>
          <p className="muted">
            Acesse dashboards preparados com os objetos aprovados no Estúdio SQL ou crie um novo
            painel no modo No-Code.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button btn-lime" type="button" onClick={handleCreate}>
            + Criar Novo Dashboard
          </button>
        </div>
      </section>

      <section className="reports-grid">
        {isLoading ? (
          <p className="muted">Carregando dashboards...</p>
        ) : (
          dashboards.map((dashboard) => (
            <article key={dashboard.id} className="dashboard-card">
              <header>
                <h2>{dashboard.title}</h2>
              </header>
              <p>{dashboard.description}</p>
              <div className="dashboard-card-meta">
                <span>{dashboard.widgetsCount ?? 0} widgets</span>
                <span>
                  {dashboard.updatedAt
                    ? new Date(dashboard.updatedAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Atualizado recentemente"}
                </span>
              </div>
              <div className="dashboard-card-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => router.push(`/area-de-dados/construtor/${dashboard.id}`)}
                >
                  Abrir painel
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      {error && <p className="muted">{error}</p>}
    </AppShell>
  );
}
