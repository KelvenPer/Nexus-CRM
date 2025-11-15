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

// Usar uma unica chave para o objeto de sessao completo
const SESSION_KEY = "nexus_session";

type ApiError = { detail?: string; message?: string };

/**
 * Decodifica um token JWT sem validar a assinatura.
 * @param token O token JWT.
 * @returns O payload decodificado ou null em caso de erro.
 */
function decodeJwt<T>(token: string): T | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString();
    return JSON.parse(jsonPayload) as T;
  } catch (e) {
    console.error("Falha ao decodificar o token JWT:", e);
    return null;
  }
}

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
  // Armazena o objeto de sessao inteiro
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  // Remove a chave unica da sessao
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const rawSession = localStorage.getItem(SESSION_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as AuthSession;
    const tokenPayload = decodeJwt<{ exp: number }>(session.access_token);

    // Se o token estiver expirado, limpa a sessao e retorna null
    if (tokenPayload && tokenPayload.exp * 1000 < Date.now()) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    // Se houver erro no parse, limpa a sessao para evitar estados invalidos
    clearSession();
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const session = getStoredSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function logout(): Promise<void> {
  const session = getStoredSession();
  try {
    if (session?.access_token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.access_token }),
      });
    }
  } catch (error) {
    console.error("Erro ao finalizar a sessao", error);
  } finally {
    clearSession();
  }
}
