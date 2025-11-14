import { SupplierPortalLayout } from "@/components/supplier-portal/Layout";
import { apiFetch } from "@/lib/api";
import type { SupplierPortalResponse, SupplierAlert, WeeklyEmailReport } from "@/types/trade";

const DEFAULT_SUPPLIER_ID = process.env.NEXT_PUBLIC_DEFAULT_SUPPLIER_ID ?? "supplier_demo";

async function fetchPortalData() {
  return apiFetch<SupplierPortalResponse>(`/api/supplier-portal/dashboard?supplier_id=${DEFAULT_SUPPLIER_ID}`);
}

async function fetchAlerts() {
  return apiFetch<SupplierAlert[]>(`/api/trade/suppliers/${DEFAULT_SUPPLIER_ID}/alerts`);
}

async function fetchWeeklyEmail() {
  return apiFetch<WeeklyEmailReport>(`/api/supplier-portal/reports/weekly?supplier_id=${DEFAULT_SUPPLIER_ID}`, {
    method: "POST",
  });
}

export default async function SupplierPortalPage() {
  const [portal, alerts, emailPreview] = await Promise.all([fetchPortalData(), fetchAlerts(), fetchWeeklyEmail()]);

  return (
    <SupplierPortalLayout>
      <div className="space-y-6">
        <header>
          <h1>Painel Executivo do Fornecedor</h1>
          <p className="muted">Resumo em tempo real do ROI, execucao e recomendacoes.</p>
        </header>

        {portal ? (
          <>
            <section className="grid grid-cols-4 gap-4 mt-4">
              {Object.entries(portal.executive_summary).map(([label, value]) => (
                <div key={label} className="kpi-card trade-kpi-card">
                  <p className="kpi-card-title">{label.replaceAll("_", " ")}</p>
                  <strong className="kpi-card-value">{value}</strong>
                </div>
              ))}
            </section>

            <section className="card mt-6">
              <h2>Performance financeira</h2>
              <div className="kpi-row">
                <div>
                  <p>Vendas atuais</p>
                  <strong>R$ {portal.financial_performance.sales_trend.current.toLocaleString("pt-BR")}</strong>
                  <span className="muted">
                    vs {portal.financial_performance.sales_trend.previous.toLocaleString("pt-BR")} (
                    {portal.financial_performance.sales_trend.growth}%)
                  </span>
                </div>
                <div>
                  <p>ROI (ultimos 5 periodos)</p>
                  <strong>
                    {portal.financial_performance.roi_evolution.map((value) => `${value}%`).join(" | ")}
                  </strong>
                </div>
                <div>
                  <p>Market share</p>
                  <strong>{portal.financial_performance.market_share.current}%</strong>
                  <span className="muted">tendencia {portal.financial_performance.market_share.trend}</span>
                </div>
              </div>
            </section>

            <section className="card mt-6">
              <h2>Comprovacao de execucao</h2>
              <p>
                {portal.execution_proof.assets_verified}/{portal.execution_proof.assets_contracted} ativos com prova.
              </p>
              <table className="trade-table mt-4">
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th>Status</th>
                    <th>Provas</th>
                  </tr>
                </thead>
                <tbody>
                  {portal.execution_proof.proof_status.map((item) => (
                    <tr key={item.asset}>
                      <td>{item.asset}</td>
                      <td>
                        <span className="status-pill">{item.status}</span>
                      </td>
                      <td>{item.proofs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card mt-6">
              <h2>Recomendacoes acionaveis</h2>
              <ul className="insight-list">
                {portal.actionable_insights.map((insight) => (
                  <li key={insight.title}>
                    <strong>{insight.title}</strong>
                    <p className="muted">{insight.reason}</p>
                    <p className="muted">
                      Impacto esperado: {insight.expected_impact} | Confianca: {(insight.confidence * 100).toFixed(0)}%
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <p className="mt-4">Nenhum dado disponivel para o fornecedor.</p>
        )}

        <section className="card mt-6">
          <h2>Alertas inteligentes</h2>
          {alerts?.length ? (
            <ul className="insight-list">
              {alerts.map((alert) => (
                <li key={alert.title}>
                  <span className={`badge badge-${alert.priority}`}>{alert.priority}</span>
                  <strong>{alert.title}</strong>
                  <p className="muted">{alert.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum alerta no momento.</p>
          )}
        </section>

        {emailPreview ? (
          <section className="card mt-6">
            <h2>Relatorio semanal automatico</h2>
            <p>
              <strong>Assunto:</strong> {emailPreview.subject}
            </p>
            <p className="muted">{emailPreview.featured_recommendation}</p>
            <div className="kpi-row">
              {Object.entries(emailPreview.financial_highlights).map(([key, value]) => (
                <div key={key}>
                  <p>{key}</p>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </SupplierPortalLayout>
  );
}
