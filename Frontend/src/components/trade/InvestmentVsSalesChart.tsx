import type { SalesTrendPoint } from "@/types/trade";

type Props = {
  dataPoints: SalesTrendPoint[];
};

export default function InvestmentVsSalesChart({ dataPoints }: Props) {
  const maxValue =
    dataPoints.reduce((acc, point) => Math.max(acc, point.sales_amount, point.investment_value ?? 0), 0) || 1;

  return (
    <section className="panel trade-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Performance semanal</p>
          <h3>Investimento vs Vendas</h3>
        </div>
      </header>
      <div className="chart-grid">
        {dataPoints.map((point) => {
          const salesPercent = Math.round((point.sales_amount / maxValue) * 100);
          const investmentPercent = Math.round((Number(point.investment_value ?? 0) / maxValue) * 100);
          return (
            <div key={point.label} className="chart-bar">
              <div className="chart-bar-stack">
                <span className="chart-bar-sales" style={{ height: `${salesPercent}%` }} />
                <span className="chart-bar-investment" style={{ height: `${investmentPercent}%` }} />
              </div>
              <p className="chart-bar-label">{point.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
