"use client";

import { useState } from "react";

import { uploadProof } from "@/lib/services/proofs";

type SimpleProofUploadProps = {
  assetId: string;
  contractId?: string;
};

export function SimpleProofUpload({ assetId, contractId }: SimpleProofUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      for (const file of Array.from(files)) {
        // Contexto adicional para logs/debug, sem impacto na API
        // eslint-disable-next-line no-console
        console.log(`Upload de comprovacao`, { assetId, contractId, file: file.name });
        const ok = await uploadProof(assetId, file, {
          description: `Comprovacao - ${new Date().toLocaleDateString()}`,
        });
        if (!ok) {
          setStatusMessage("Falha ao enviar uma ou mais comprovacoes.");
          break;
        }
      }
      if (!statusMessage) {
        setStatusMessage("Comprovacoes enviadas com sucesso.");
      }
    } catch {
      setStatusMessage("Erro ao enviar comprovacoes.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Enviar comprovacao</h3>
      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        disabled={isUploading}
        onChange={handleFileUpload}
      />
      <p className="text-xs text-gray-500 mt-1">
        Tipos permitidos: imagens e PDF. Tamanho maximo 10MB.
      </p>
      {statusMessage ? <p className="text-xs mt-2">{statusMessage}</p> : null}
    </div>
  );
}
