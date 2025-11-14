import { useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type ReportSummary = {
  id: string;
  report_type: string;
  status: string;
  created_at: string;
};

const REPORT_TYPES = [
  {
    id: "executive_summary",
    name: "Relatorio Executivo",
    description: "Visao resumida para diretoria",
  },
  {
    id: "detailed_analysis",
    name: "Analise Detalhada",
    description: "Relatorio tecnico completo",
  },
  {
    id: "proof_compliance",
    name: "Relatorio de Conformidade",
    description: "Foco nas comprovacoes",
  },
];

type Props = {
  contractId: string;
};

export default function ReportGenerator({ contractId }: Props) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedType, setSelectedType] = useState("executive_summary");
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/generate?contract_id=${contractId}&report_type=${selectedType}`, {
        method: "POST",
        headers: { "X-Tenant-ID": "tenant_demo" },
      });
      if (response.ok) {
        const data = await response.json();
        setReports((prev) => [
          { id: data.report_id, report_type: selectedType, status: "completed", created_at: new Date().toISOString() },
          ...prev,
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/api/reports/${id}/download`, {
      headers: { "X-Tenant-ID": "tenant_demo" },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${id}.pdf`;
    a.click();
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">Gerar relatorio</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.id}
            className={`p-3 rounded border ${selectedType === type.id ? "border-blue-500" : "border-gray-700"}`}
            onClick={() => setSelectedType(type.id)}
          >
            <p className="font-medium">{type.name}</p>
            <p className="text-xs text-gray-400">{type.description}</p>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={generateReport} disabled={loading}>
          {loading ? "Gerando..." : "Gerar PDF"}
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {reports.map((report) => (
          <div key={report.id} className="flex items-center justify-between bg-gray-800 p-3 rounded">
            <div>
              <p className="font-medium">{REPORT_TYPES.find((t) => t.id === report.report_type)?.name}</p>
              <p className="text-xs text-gray-400">{new Date(report.created_at).toLocaleString()}</p>
            </div>
            <button className="text-blue-400 text-sm" onClick={() => downloadReport(report.id)}>
              Download
            </button>
          </div>
        ))}
        {reports.length === 0 ? <p className="text-gray-500">Nenhum relatorio gerado.</p> : null}
      </div>
    </div>
  );
}
