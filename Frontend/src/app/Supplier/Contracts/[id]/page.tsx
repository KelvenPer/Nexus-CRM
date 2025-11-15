"use client";

import { useRouter } from "next/navigation";

import { SimpleProofUpload } from "@/components/Proofs/SimpleProofUpload";
import { useSupplierContract } from "@/hooks/useSupplierContract";

type Props = {
  params: { id: string };
};

export default function ContractDetailPage({ params }: Props) {
  const router = useRouter();
  const { contract, isLoading } = useSupplierContract(params.id);

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!contract) {
    return <div className="p-6">Contrato não encontrado.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <button
        type="button"
        className="text-sm text-blue-500 underline"
        onClick={() => router.push("/Supplier/Portal")}
      >
        ← Voltar ao portal
      </button>
      <header>
        <h1 className="text-2xl font-bold mb-1">{contract.title}</h1>
        <p className="text-gray-600">
          Fornecedor: {contract.supplier_name ?? contract.supplier_id} | Status: {contract.status}
        </p>
        <p className="text-gray-600">
          Período:{" "}
          {new Date(contract.start_date).toLocaleDateString("pt-BR")} -{" "}
          {new Date(contract.end_date).toLocaleDateString("pt-BR")}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Comprovações</h2>
        <SimpleProofUpload assetId={contract.id} contractId={contract.id} />
      </section>
    </div>
  );
}
