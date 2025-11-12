export const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export type TenantInfo = {
  email: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  tenantLogoUrl?: string;
};

export type AuthSession = {
  access_token: string;
  token_type: string;
  userId: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  tenantLogoUrl?: string;
  roles?: string[];
};

const TOKEN_KEY = "nexus_token";
const USER_KEY = "nexus_user";

type ApiError = { detail?: string; message?: string };

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    const detail = (data as ApiError | undefined)?.detail ?? (data as ApiError | undefined)?.message;
    throw new Error(detail ?? `Falha ao acessar ${path} (${response.status})`);
  }

  return data as TResponse;
}

export async function checkEmail(email: string): Promise<TenantInfo> {
  return postJson<TenantInfo>("/auth/check-email", { email });
}

export async function authenticate(email: string, password: string): Promise<AuthSession> {
  return postJson<AuthSession>("/auth/token", { email, password });
}

export function persistSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function logout(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  try {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    }
  } catch (error) {
    console.error("Erro ao finalizar a sessao", error);
  } finally {
    clearSession();
  }
}
