import { useEffect, useState } from "react";

import { fetchSupplierDashboard, type SupplierDashboard } from "@/lib/services/supplierPortal";

export function useSupplierDashboard(supplierId: string) {
  const [data, setData] = useState<SupplierDashboard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!supplierId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      const result = await fetchSupplierDashboard(supplierId);
      if (!cancelled) {
        setData(result);
        setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  return { data, isLoading };
}

