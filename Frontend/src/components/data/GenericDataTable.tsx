import React from "react";

export type Column<T extends Record<string, unknown> = Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

type GenericDataTableProps<T extends Record<string, unknown>> = {
  title: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
};

export function GenericDataTable<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  data,
}: GenericDataTableProps<T>) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Visor dinamico</p>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        <button type="button" className="ghost-button">
          Atualizar dados
        </button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : (row[column.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
