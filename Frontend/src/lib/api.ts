const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

// Minimal helper used by solucoes pages; always returns a value.
export async function fetchJson<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  const data = await apiFetch<T>(path, init);
  return (data ?? fallback) as T;
}

export { API_BASE_URL };
