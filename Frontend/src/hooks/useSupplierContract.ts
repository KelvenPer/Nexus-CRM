import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";
import type { ContractAsset, JBPContractRecord } from "@/types/trade";

export function useSupplierContract(contractId: string | null) {
  const [contract, setContract] = useState<JBPContractRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!contractId) {
      setContract(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/proofs/contracts/${contractId}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) setContract(null);
          return;
        }
        const raw = (await response.json()) as any;

        const assets: ContractAsset[] =
          Array.isArray(raw.selected_assets)
            ? raw.selected_assets.map((a: any) => ({
                id: String(a.id),
                name: String(a.asset_name ?? a.name ?? ""),
                asset_type: String(a.asset_catalog_id ?? a.asset_type ?? ""),
                description: String(a.placement ?? a.description ?? ""),
                proof_requirements: Array.isArray(a.proofs_required)
                  ? a.proofs_required.map((req: any) =>
                      typeof req === "string" ? req : String(req.type ?? ""),
                    )
                  : [],
              }))
            : [];

        const data: JBPContractRecord = {
          id: String(raw.id),
          supplier_id: String(raw.supplier_id),
          supplier_name: raw.supplier_name ? String(raw.supplier_name) : undefined,
          title: String(raw.title),
          status: String(raw.status),
          current_roi: Number(raw.current_roi ?? 0),
          total_investment: Number(raw.total_investment ?? 0),
          start_date: String(raw.start_date),
          end_date: String(raw.end_date),
          proof_status: String(raw.proof_status),
          completion_percentage: Number(raw.completion_percentage ?? 0),
          selected_assets: assets,
        };
        if (!cancelled) {
          setContract(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  return { contract, isLoading };
}
