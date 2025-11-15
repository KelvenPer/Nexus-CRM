import { clearSession, getAuthHeaders } from "@/lib/auth";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const baseHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    const authHeaders =
      typeof window !== "undefined" ? (getAuthHeaders() as HeadersInit) : ({} as HeadersInit);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers: {
        ...baseHeaders,
        ...authHeaders,
        ...(init?.headers || {}),
      },
    });

    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        try {
          clearSession();
        } catch {
          // ignore storage errors
        }
        window.location.href = "/login";
      }
      return null;
    }

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
