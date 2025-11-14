type Row = {
  name: string;
  sales?: number | null;
  roi?: number | null;
  rotation?: string | null;
};

type Props = {
  rows: Row[];
};

export default function SupplierROITable({ rows }: Props) {
  return (
    <section className="panel trade-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Eficiência</p>
          <h3>Top fornecedores por ROI</h3>
        </div>
      </header>
      <table className="trade-table">
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th className="text-right">Vendas</th>
            <th className="text-right">ROI</th>
            <th>Rotação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td className="text-right">{row.sales ? `R$ ${row.sales.toLocaleString("pt-BR")}` : "-"}</td>
              <td className="text-right">{row.roi ? `${row.roi.toFixed(1)}%` : "-"}</td>
              <td>{row.rotation ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
