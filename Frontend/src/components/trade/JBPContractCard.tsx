"use client";

import { useRouter } from "next/navigation";

type ProofProgress = {
  completed: number;
  required: number;
};

export type JBPContractCardProps = {
  id: string;
  title: string;
  supplierName?: string;
  status: string;
  investment?: number;
  roi?: number;
  proofs?: ProofProgress;
};

export function JBPContractCard({
  id,
  title,
  supplierName,
  status,
  investment,
  roi,
  proofs,
}: JBPContractCardProps) {
  const router = useRouter();
  const completed = proofs?.completed ?? 0;
  const required = proofs?.required ?? 0;
  const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-900 text-white">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-50">{title}</h4>
          {supplierName ? <p className="text-sm text-gray-400">{supplierName}</p> : null}
        </div>
        <span className="px-2 py-1 rounded-full text-xs bg-blue-600">{status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-400">Investimento</p>
          <p className="font-semibold">
            {investment != null ? investment.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">ROI Atual</p>
          <p className="font-semibold text-green-400">{roi != null ? `${roi.toFixed(1)}%` : "—"}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1 text-gray-300">
          <span>Comprovacoes</span>
          <span>
            {completed}/{required || "?"}
          </span>
        </div>
        <div className="w-full h-2 rounded bg-gray-700 overflow-hidden">
          <div className="h-2 bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex space-x-2 mt-3">
        <button
          type="button"
          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
          onClick={() => {
            router.push(`/Supplier/Proofs/Upload?contractId=${id}`);
          }}
        >
          📤 Enviar comprovacao
        </button>
        <button
          type="button"
          className="flex-1 border border-gray-500 py-2 px-3 rounded text-sm hover:bg-gray-800"
          onClick={() => {
            router.push(`/Supplier/Contracts/${id}`);
          }}
        >
          📊 Ver detalhes
        </button>
      </div>
    </div>
  );
}
