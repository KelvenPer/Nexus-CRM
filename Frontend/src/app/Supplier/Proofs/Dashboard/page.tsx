import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import type { JBPContractRecord, ProofDashboard } from "@/types/trade";

async function fetchContracts() {
  return apiFetch<{ items: JBPContractRecord[] }>("/api/trade/contracts");
}

async function fetchDashboard(contractId: string) {
  return apiFetch<ProofDashboard>(`/api/trade/contracts/${contractId}/proof-dashboard`);
}

export default async function SupplierProofDashboardPage() {
  const contractsResponse = await fetchContracts();
  const contracts = contractsResponse?.items ?? [];
  const highlightContract = contracts[0];
  const dashboard = highlightContract ? await fetchDashboard(highlightContract.id) : null;

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>Comprovação de Ativos</h1>
        <p className="muted">Transparência e provas em tempo real dos investimentos de Trade.</p>

        {dashboard ? (
          <section className="card mt-4">
            <header className="panel-header">
              <div>
                <p className="eyebrow">Contrato destaque</p>
                <h2>{dashboard.supplier_name}</h2>
              </div>
              <p className="muted">{dashboard.period}</p>
            </header>
            <div className="kpi-grid">
              <div className="kpi-card trade-kpi-card">
                <p>Total investido</p>
                <strong>R$ {dashboard.executive_summary.total_investment.toLocaleString("pt-BR")}</strong>
              </div>
              <div className="kpi-card trade-kpi-card">
                <p>Ativos contratados</p>
                <strong>{dashboard.executive_summary.assets_contracted}</strong>
              </div>
              <div className="kpi-card trade-kpi-card">
                <p>Executados</p>
                <strong>{dashboard.executive_summary.assets_executed}</strong>
              </div>
              <div className="kpi-card trade-kpi-card">
                <p>Verificados</p>
                <strong>{dashboard.executive_summary.assets_verified}</strong>
              </div>
            </div>
          </section>
        ) : (
          <p className="mt-4">Nenhum contrato cadastrado.</p>
        )}

        <section className="card mt-6">
          <h3>Contratos ativos</h3>
          <table className="trade-table mt-4">
            <thead>
              <tr>
                <th>Título</th>
                <th>Período</th>
                <th>Status</th>
                <th className="text-right">Comprovação</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td>
                    <a href={`/Supplier/Proofs/Contract/${contract.id}`} className="link">
                      {contract.title}
                    </a>
                  </td>
                  <td>
                    {new Date(contract.start_date).toLocaleDateString("pt-BR")} -{" "}
                    {new Date(contract.end_date).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    <span className="status-pill">{contract.status}</span>
                  </td>
                  <td className="text-right">{contract.completion_percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
