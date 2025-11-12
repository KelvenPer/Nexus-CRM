import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Trigger = {
  id: string;
  nome: string;
  objeto: string;
  condicao: string;
  acao: string;
  status: string;
};

async function fetchTriggers(): Promise<Trigger[]> {
  const data = await fetchJson<Trigger[]>("/api/v1/automacao/gatilhos", []);
  return Array.isArray(data) ? data : [];
}

export default async function GatilhosPage() {
  const triggers = await fetchTriggers();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Automacao</p>
            <h2>Gatilhos de dados</h2>
            <p className="muted">
              Defina condicoes baseadas em objetos e KPIs para disparar notificacoes, fluxos e integrações externas.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar regra</button>
            <button className="primary-button">Novo gatilho</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Regras configuradas</p>
              <h3>Lista de gatilhos</h3>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Objeto</th>
                  <th>Condicao</th>
                  <th>Acao</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {triggers.map((trigger) => (
                  <tr key={trigger.id}>
                    <td>{trigger.nome}</td>
                    <td>{trigger.objeto}</td>
                    <td>{trigger.condicao}</td>
                    <td>{trigger.acao}</td>
                    <td>
                      <span className="badge">{trigger.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!triggers.length && (
              <div className="p-6 text-center text-sm text-gray-400">Nenhum gatilho configurado.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
