type Props = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function KpiCard({ title, value, subtitle }: Props) {
  return (
    <div className="kpi-card trade-kpi-card">
      <p className="kpi-card-title">{title}</p>
      <strong className="kpi-card-value">{value}</strong>
      {subtitle ? <p className="kpi-card-subtitle">{subtitle}</p> : null}
    </div>
  );
}
