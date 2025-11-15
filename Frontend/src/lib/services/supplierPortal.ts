import { API_BASE_URL } from "@/lib/api";
import { getAuthHeaders } from "@/lib/auth";
import type { SupplierDashboard } from "@/types/supplier-portal";

export async function fetchSupplierDashboard(
  supplierId: string,
): Promise<SupplierDashboard | null> {
  if (!supplierId) {
    return null;
  }
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };
  const response = await fetch(
    `${API_BASE_URL}/api/supplier-portal/dashboard?supplier_id=${encodeURIComponent(
      supplierId,
    )}`,
    {
      headers,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as SupplierDashboard;
}
