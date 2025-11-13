import React from "react";

interface ResultsPanelProps {
  queryResult: Record<string, unknown>[];
  isLoading: boolean;
  executionTime: string;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  queryResult,
  isLoading,
  executionTime,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-4 bg-gray-900 rounded-xl border border-gray-800">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-400" />
        <p className="ml-4 text-white text-sm">Executando consulta...</p>
      </div>
    );
  }

  if (!queryResult || queryResult.length === 0) {
    return (
      <div className="p-4 bg-gray-900 rounded-xl border border-dashed border-gray-700 text-gray-400 text-sm">
        <p>Nenhum resultado para exibir. Teste uma consulta para ver os dados aqui.</p>
      </div>
    );
  }

  const headers = Object.keys(queryResult[0]);

  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">Resultados</h3>
        {executionTime && (
          <p className="text-xs text-gray-400">Tempo de execucao: {executionTime}</p>
        )}
      </div>
      <div className="overflow-auto max-h-64 border border-gray-800 rounded-lg">
        <table className="min-w-full text-sm text-left text-gray-200">
          <thead className="text-xs text-lime-400 uppercase bg-gray-800 sticky top-0">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className="px-4 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {queryResult.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="odd:bg-gray-900 even:bg-gray-800 border-b border-gray-800 last:border-none"
              >
                {headers.map((header) => (
                  <td key={`${rowIndex}-${header}`} className="px-4 py-2 align-top">
                    {String(row[header] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsPanel;
