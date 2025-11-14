"use client";

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type ProofRecord = {
  id: string;
  file_name: string;
  proof_type: string;
  status: string;
  created_at: string;
};

type Props = {
  assetId: string;
};

export default function BasicProofUpload({ assetId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState<ProofRecord[]>([]);

  useEffect(() => {
    const fetchProofs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/proofs/asset/${assetId}`, {
          headers: { "X-Tenant-ID": "tenant_demo" },
        });
        if (response.ok) {
          const data = await response.json();
          setProofs(data.items ?? []);
        }
      } catch {
        // ignore
      }
    };
    fetchProofs();
  }, [assetId]);

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
        headers: { "X-Tenant-ID": "tenant_demo" },
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        setProofs((prev) => [result.proof, ...prev]);
      } else {
        console.error("Erro upload", await response.text());
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-900">
      <h3 className="text-lg font-semibold mb-4">Comprovacoes</h3>
      <div className="mb-4">
        <label className="block text-sm mb-2">Adicionar arquivo</label>
        <input type="file" accept="image/*,application/pdf" disabled={uploading} onChange={handleFileUpload} />
        <p className="text-xs text-gray-400 mt-1">Tipos permitidos: JPG, PNG, GIF, PDF (max 10MB)</p>
      </div>
      <div className="space-y-3">
        {proofs.map((proof) => (
          <div key={proof.id} className="flex items-center justify-between bg-gray-800 p-3 rounded">
            <div>
              <p className="font-medium">{proof.file_name}</p>
              <p className="text-xs text-gray-400">
                {proof.proof_type} · {proof.status}
              </p>
            </div>
            <span className="text-xs text-gray-500">{new Date(proof.created_at).toLocaleDateString()}</span>
          </div>
        ))}
        {proofs.length === 0 ? <p className="text-center text-gray-500">Sem comprovacoes ainda.</p> : null}
      </div>
    </div>
  );
}
