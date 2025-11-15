import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";

export type JBPContract = {
  id: string;
  title: string;
  status: string;
  supplier_name?: string;
  total_investment?: number;
  current_roi?: number;
  proofs_completed?: number;
  proofs_required?: number;
};

type ContractListResponse = {
  items: JBPContract[];
  total: number;
};

export function useSupplierContracts(supplierId: string) {
  const [contracts, setContracts] = useState<JBPContract[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!supplierId) {
      setContracts([]);
      setIsLoading(false);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/proofs/contracts?supplier_id=${encodeURIComponent(
          supplierId,
        )}`,
        {
          headers: getAuthHeaders(),
          cache: "no-store",
        },
      );
      if (response.ok) {
        const data = (await response.json()) as ContractListResponse;
        setContracts(data.items ?? []);
      } else {
        setContracts([]);
      }
      setIsLoading(false);
    };

    run();
  }, [supplierId]);

  return { contracts, isLoading };
}

