"use client";

import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type ProofRecord = {
  id: string;
  file_name: string;
  proof_type: string;
  status: string;
  processing_status: string;
  created_at: string;
};

type ProcessingStatus = {
  proof: ProofRecord & { metadata?: Record<string, any> };
  validations: { validation_type: string; passed: boolean; message: string }[];
};

type Props = {
  assetId: string;
};

export default function EnhancedProofUpload({ assetId }: Props) {
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, ProcessingStatus>>({});
  const [uploading, setUploading] = useState(false);

  const fetchProofs = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/proofs/asset/${assetId}`, {
      headers: { "X-Tenant-ID": "tenant_demo" },
    });
    if (response.ok) {
      const data = await response.json();
      setProofs(data.items ?? []);
    }
  }, [assetId]);

  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  useEffect(() => {
    const interval = setInterval(async () => {
      for (const proof of proofs) {
        if (proof.processing_status !== "completed") {
          const status = await fetchProcessingStatus(proof.id);
          if (status) {
            setStatusMap((prev) => ({ ...prev, [proof.id]: status }));
          }
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [proofs]);

  const fetchProcessingStatus = async (proofId: string): Promise<ProcessingStatus | null> => {
    const response = await fetch(`${API_BASE_URL}/api/proofs/status/${proofId}`, {
      headers: { "X-Tenant-ID": "tenant_demo" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("proof", file);
    formData.append("assetId", assetId);
    formData.append("proofType", "photo");
    formData.append("description", `Comprovacao para asset ${assetId}`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/proofs/upload`, {
        method: "POST",
        body: formData,
        headers: { "X-Tenant-ID": "tenant_demo" },
      });
      if (response.ok) {
        const payload = await response.json();
        setProofs((prev) => [payload.proof, ...prev]);
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const resolveStatus = (proof: ProofRecord) => {
    return statusMap[proof.id]?.proof.processing_status ?? proof.processing_status ?? "pending";
  };

  const metadataFor = (proof: ProofRecord) => statusMap[proof.id]?.proof.metadata;

  return (
    <div className="border rounded-lg p-4 bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">Comprovacoes</h3>
      <div className="mb-4">
        <label className="block text-sm mb-2">Adicionar arquivo</label>
        <input type="file" accept="image/*,application/pdf" disabled={uploading} onChange={handleFileUpload} />
        <p className="text-xs text-gray-400 mt-1">Arquivos: JPG, PNG, GIF, WEBP ou PDF. Limite 10MB.</p>
      </div>
      <div className="space-y-3">
        {proofs.map((proof) => (
          <div key={proof.id} className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{proof.file_name}</p>
                <p className="text-xs text-gray-400">
                  {proof.proof_type} · {proof.status} · {new Date(proof.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={resolveStatus(proof)} />
            </div>
            {metadataFor(proof) ? (
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mt-3">
                {metadataFor(proof)?.dimensions?.original ? (
                  <div>
                    Dimensoes: {metadataFor(proof)?.dimensions.original.width} ×{" "}
                    {metadataFor(proof)?.dimensions.original.height}
                  </div>
                ) : null}
                {metadataFor(proof)?.page_count ? <div>Paginas: {metadataFor(proof)?.page_count}</div> : null}
                {metadataFor(proof)?.dominant_color ? (
                  <div className="flex items-center gap-1">
                    <span>Cor:</span>
                    <span
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: metadataFor(proof)?.dominant_color }}
                    ></span>
                    {metadataFor(proof)?.dominant_color}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        {proofs.length === 0 ? <p className="text-center text-gray-500">Sem comprovacoes.</p> : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendente", className: "bg-yellow-500" },
    processing: { label: "Processando", className: "bg-blue-500" },
    completed: { label: "Concluido", className: "bg-green-600" },
    failed: { label: "Falhou", className: "bg-red-600" },
  };
  const cfg = map[status] ?? map.pending;
  return <span className={`px-2 py-1 rounded-full text-xs text-white ${cfg.className}`}>{cfg.label}</span>;
}
