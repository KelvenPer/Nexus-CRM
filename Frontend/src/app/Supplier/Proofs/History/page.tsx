import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import type { ProofHistoryResponse } from "@/types/trade";

async function fetchHistory() {
  return apiFetch<ProofHistoryResponse>("/api/trade/proofs/history");
}

export default async function ProofHistoryPage() {
  const history = await fetchHistory();
  const entries = history?.entries ?? [];

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>Histórico de comprovações</h1>
        <section className="card mt-4">
          <table className="trade-table">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Ativo</th>
                <th>Tipo</th>
                <th>Enviado em</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={`${entry.contract_id}-${entry.url}`}>
                  <td>{entry.contract_id}</td>
                  <td>{entry.asset_name}</td>
                  <td>
                    <a href={entry.url} target="_blank" rel="noreferrer" className="link">
                      {entry.proof_type}
                    </a>
                  </td>
                  <td>{new Date(entry.uploaded_at).toLocaleString("pt-BR")}</td>
                  <td>{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
