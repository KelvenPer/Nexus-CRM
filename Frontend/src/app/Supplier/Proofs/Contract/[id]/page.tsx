import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import type { JBPContractRecord, ProofDashboard } from "@/types/trade";

type Props = {
  params: { id: string };
};

async function fetchContract(id: string) {
  return apiFetch<JBPContractRecord>(`/api/trade/contracts/${id}`);
}

async function fetchDashboard(id: string) {
  return apiFetch<ProofDashboard>(`/api/trade/contracts/${id}/proof-dashboard`);
}

export default async function ContractDetailPage({ params }: Props) {
  const contract = await fetchContract(params.id);
  const dashboard = await fetchDashboard(params.id);

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>{contract?.title ?? "Contrato"}</h1>
        <p className="muted">
          {contract
            ? `${new Date(contract.start_date).toLocaleDateString("pt-BR")} - ${new Date(
                contract.end_date,
              ).toLocaleDateString("pt-BR")}`
            : null}
        </p>

        {dashboard ? (
          <>
            <section className="card mt-4">
              <h2>Progresso geral</h2>
              <p>
                {dashboard.executive_summary.assets_verified} de {dashboard.executive_summary.assets_contracted} ativos
                comprovados ({dashboard.executive_summary.completion_percentage}%)
              </p>
            </section>
            <section className="card mt-6">
              <h3>Ativos</h3>
              <table className="trade-table mt-4">
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Status</th>
                    <th>Período</th>
                    <th>Provas</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.assets_status.map((asset) => (
                    <tr key={asset.asset_id}>
                      <td>
                        <a href={`/Supplier/Proofs/Asset/${asset.asset_id}`} className="link">
                          {asset.asset_name}
                        </a>
                      </td>
                      <td>
                        <span className="status-pill">{asset.status}</span>
                      </td>
                      <td>{asset.scheduled_period}</td>
                      <td>
                        {asset.proof_types.length
                          ? asset.proof_types.map((proof) => `${proof.type} (${proof.status})`).join(", ")
                          : "Sem provas"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <p className="mt-4">Dashboard não disponível.</p>
        )}
      </div>
    </AppShell>
  );
}
