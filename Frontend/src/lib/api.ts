export const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export async function fetchJson<T>(
  path: string,
  fallback: T,
  init?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
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
