import { getAuthHeaders, API_BASE_URL } from "@/lib/auth";

export async function fetchJson<T>(
  path: string,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: { ...(init?.headers as Record<string, string> | undefined), ...getAuthHeaders() },
    });
    if (!response.ok) {
      return fallback;
    }
    const data = (await response.json()) as T;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}
