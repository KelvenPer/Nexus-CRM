import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type TradeVisit = {
  id: string;
  cliente: string;
  canal: string;
  objetivo: string;
  status: string;
  responsavel: string;
  proximaAcao: string;
  data: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

async function fetchTradeVisits(): Promise<TradeVisit[]> {
  const data = await fetchJson<TradeVisit[]>("/api/v1/solucoes/trade-marketing/visitas", []);
  return Array.isArray(data) ? data : [];
}

export default async function TradeMarketingPage() {
  const visits = await fetchTradeVisits();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Trade Marketing</p>
            <h2>Execucao em loja</h2>
            <p className="muted">
              Rastreie auditorias, ativações e degustações planejadas, com status por responsavel e canal.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Enviar briefing</button>
            <button className="primary-button">Nova visita</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Visitas</p>
              <h3>Agenda de campo</h3>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Objetivo</th>
                  <th>Responsavel</th>
                  <th>Canal</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.cliente}</td>
                    <td>
                      <div>{visit.objetivo}</div>
                      <p className="text-xs text-gray-400">{visit.proximaAcao}</p>
                    </td>
                    <td>{visit.responsavel}</td>
                    <td>{visit.canal}</td>
                    <td>
                      <span className="badge">{visit.status}</span>
                    </td>
                    <td>{dateFormatter.format(new Date(visit.data))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visits.length && (
              <div className="p-6 text-center text-sm text-gray-400">Nenhuma visita planejada.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
