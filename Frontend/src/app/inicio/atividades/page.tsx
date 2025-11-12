import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type ActivityItem = {
  id: string;
  customer: string;
  action: string;
  status: string;
  badge: string;
  dueDate: string;
};

type ActivitiesResponse = {
  items?: ActivityItem[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

async function fetchActivities(): Promise<ActivityItem[]> {
  const data = await fetchJson<ActivitiesResponse>("/api/v1/inicio/atividades", { items: [] });
  return Array.isArray(data.items) ? data.items : [];
}

export default async function ActivitiesPage() {
  const activities = await fetchActivities();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Minhas Atividades</p>
            <h2>Execucao diaria em um so lugar</h2>
            <p className="muted">
              Veja todas as interacoes pendentes por cliente, status e prazo. O painel ja traz o SLA do tenant ativo.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar da agenda</button>
            <button className="primary-button">Nova atividade</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Fila priorizada</p>
              <h3>Acoes pendentes</h3>
            </div>
            <button className="ghost-button small">Exportar</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Acao</th>
                  <th>Status</th>
                  <th>Etiqueta</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <strong>{activity.customer}</strong>
                    </td>
                    <td>{activity.action}</td>
                    <td>
                      <span className="status-pill">{activity.status}</span>
                    </td>
                    <td>
                      <span className="badge">{activity.badge}</span>
                    </td>
                    <td>{dateFormatter.format(new Date(activity.dueDate))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!activities.length && (
              <div className="p-6 text-center text-sm text-gray-400">Nenhuma atividade encontrada.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
