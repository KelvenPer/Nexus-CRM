"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import AssetSelector from "@/components/Proofs/AssetSelector";
import { SimpleProofUpload } from "@/components/Proofs/SimpleProofUpload";
import { useSupplierContract } from "@/hooks/useSupplierContract";

export default function ProofUploadPage() {
  const searchParams = useSearchParams();
  const contractId = searchParams.get("contractId");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const { contract, isLoading } = useSupplierContract(contractId);

  if (isLoading) return <div className="p-6">Carregando contrato...</div>;
  if (!contract) return <div className="p-6">Contrato não encontrado</div>;

  const assetFromQuery = searchParams.get("assetId");
  const targetAssetId = selectedAssetId || assetFromQuery || contract.id;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Enviar Comprovações</h1>
        <p className="text-gray-600 mt-1">
          Contrato: <span className="font-medium">{contract.title}</span>
        </p>
        <p className="text-gray-600">
          Fornecedor:{" "}
          <span className="font-medium">{contract.supplier_name ?? contract.supplier_id}</span>
        </p>
      </div>

      {contract.selected_assets && contract.selected_assets.length > 0 ? (
        <div className="mb-6">
          <AssetSelector
            assets={contract.selected_assets}
            selectedAssetId={selectedAssetId}
            onAssetSelect={setSelectedAssetId}
          />
        </div>
      ) : null}

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          {selectedAssetId
            ? `Comprovar: ${
                contract.selected_assets?.find((a) => a.id === selectedAssetId)?.name ?? "Ativo selecionado"
              }`
            : "Comprovações gerais do contrato"}
        </h2>

        <SimpleProofUpload assetId={targetAssetId} contractId={contract.id} />
      </div>
    </div>
  );
}
