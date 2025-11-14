import AppShell from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api";
import type { JBPListResponse } from "@/types/trade";

async function fetchJbps() {
  return apiFetch<JBPListResponse>("/api/trade/jbp");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function JBPListPage() {
  const jbpResponse = (await fetchJbps()) ?? { items: [] };

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>Planos JBP ativos</h1>
        <p className="muted">Visao simplificada dos planos em execucao e seus periodos.</p>
        <div className="card mt-4">
          <table className="trade-table">
            <thead>
              <tr>
                <th>Plano</th>
                <th>Fornecedor</th>
                <th>Periodo</th>
                <th className="text-right">Investimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jbpResponse.items.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhum JBP cadastrado.</td>
                </tr>
              ) : (
                jbpResponse.items.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.title}</td>
                    <td>{plan.supplier_id}</td>
                    <td>
                      {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                    </td>
                    <td className="text-right">R$ {plan.investment_value.toLocaleString("pt-BR")}</td>
                    <td>
                      <span className="status-pill">{plan.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
