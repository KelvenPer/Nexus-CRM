import AppShell from "@/components/layout/AppShell";
import InvestmentVsSalesChart from "@/components/trade/InvestmentVsSalesChart";
import SupplierROITable from "@/components/trade/SupplierROITable";
import { apiFetch } from "@/lib/api";
import type { SupplierReport } from "@/types/trade";

type PageProps = {
  params: { id: string };
};

async function fetchSupplierReport(id: string) {
  return apiFetch<SupplierReport>(`/api/data/supplier-report/${id}`);
}

export default async function SupplierReportPage({ params }: PageProps) {
  const report = await fetchSupplierReport(params.id);

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <header>
          <h1>Relatorio do fornecedor</h1>
          <p className="muted">Diagnostico semanal com ROI, crescimento e insights acionaveis.</p>
        </header>
        {report ? (
          <>
            <section className="card mt-4">
              <h2>{report.summary.supplier_name}</h2>
              <p className="muted">{report.summary.period}</p>
              <div className="kpi-row">
                <div>
                  <p>Total de vendas</p>
                  <strong>R$ {report.summary.total_sales.toLocaleString("pt-BR")}</strong>
                </div>
                <div>
                  <p>Crescimento</p>
                  <strong>{(report.summary.growth_percentage ?? 0).toFixed(1)}%</strong>
                </div>
                <div>
                  <p>Market share</p>
                  <strong>{(report.summary.market_share ?? 0).toFixed(1)}%</strong>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <InvestmentVsSalesChart dataPoints={report.trend} />
              <SupplierROITable
                rows={report.product_analysis.top_performers.map((product) => ({
                  name: product.name,
                  sales: product.sales_amount ?? 0,
                  roi: product.growth_percentage ?? undefined,
                  rotation: product.rotation_speed,
                }))}
              />
            </div>

            <section className="card mt-6">
              <h3>Insights priorizados</h3>
              <ul className="insight-list">
                {report.insights.map((insight) => (
                  <li key={insight.id}>
                    <div>
                      <span className={`badge badge-${insight.priority}`}>{insight.priority}</span>
                      <strong>{insight.title}</strong>
                      <p className="muted">{insight.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <p>Relatorio nao encontrado.</p>
        )}
      </div>
    </AppShell>
  );
}
