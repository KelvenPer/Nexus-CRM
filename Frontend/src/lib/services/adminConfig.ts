import { fetchJson } from "@/lib/api";

const ADMIN_BASE = "/api/v1/admin/config";

const DEFAULT_NOTIFICATION_CONFIG = {
  email: { host: "", port: 0, from: "" },
  sms: { provider: "", token: "" },
  push: { provider: "", apiKey: "" },
} as const;

export type ConfigSection =
  | "usuarios"
  | "permissoes"
  | "dados"
  | "templates"
  | "notificacoes"
  | "sla"
  | "configuracoes"
  | "integracoes"
  | "logs";

export type UserRole =
  | "Administrador"
  | "Gerente de Trade"
  | "Analista de Dados"
  | "Assistente de Trade"
  | "Visitante";

export type UserStatus = "Ativo" | "Inativo";

export type UserRecord = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type UserPayload = {
  id?: string;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
};

export type ModuleToggle = {
  id: string;
  label: string;
  enabled: boolean;
  description: string;
};

export type RoleGroup = {
  id: string;
  name: string;
  description: string;
  editable: boolean;
};

export type PermissionToggle = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type PermissionModule = {
  id: string;
  name: string;
  toggles: PermissionToggle[];
};

export type RolePermissionMap = Record<string, string[]>;

export type CustomTable = {
  id: string;
  name: string;
  owner: string;
  fields: number;
  lastUpdated: string;
};

export type SystemTable = {
  id: string;
  name: string;
  description: string;
};

export type TemplateRecord = {
  id: string;
  name: string;
  type: "contract" | "email";
  content: string;
  variables: string[];
};

export type NotificationTrigger = {
  id: string;
  event: string;
  template: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  active: boolean;
};

export type NotificationConfig = {
  email: {
    host: string;
    port: number;
    from: string;
  };
  sms: {
    provider: string;
    token: string;
  };
  push: {
    provider: string;
    apiKey: string;
  };
};

export type SlaRule = {
  priority: "Alta" | "Media" | "Baixa";
  responseTime: number;
  responseUnit: "min" | "h" | "d";
  resolutionTime: number;
  resolutionUnit: "min" | "h" | "d";
};

export type SlaSettings = {
  workingHours: {
    start: string;
    end: string;
    weekDays: boolean;
  };
  rules: SlaRule[];
};

export type ApiKey = {
  id: string;
  label: string;
  mask: string;
  createdAt: string;
};

export type WebhookEndpoint = {
  id: string;
  event: string;
  url: string;
  active: boolean;
};

export type AuditEntry = {
  id: string;
  timestamp: string;
  user: string;
  type: "LOGIN" | "UPLOAD" | "EDICAO";
  description: string;
};

const jsonHeaders = { "Content-Type": "application/json" };

// Users
export async function fetchUsers() {
  return fetchJson<UserRecord[]>(`${ADMIN_BASE}/users`, []);
}

export async function saveUser(payload: UserPayload) {
  const url = payload.id ? `${ADMIN_BASE}/users/${payload.id}` : `${ADMIN_BASE}/users`;
  const method = payload.id ? "PUT" : "POST";
  return fetchJson<UserRecord | null>(url, null, {
    method,
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  return fetchJson<UserRecord | null>(`${ADMIN_BASE}/users/${userId}/status`, null, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ status }),
  });
}

// Roles & permissions
export async function fetchRoleGroups() {
  return fetchJson<RoleGroup[]>(`${ADMIN_BASE}/roles`, []);
}

export async function fetchPermissionMatrix() {
  return fetchJson<PermissionModule[]>(`${ADMIN_BASE}/roles/modules`, []);
}

export async function fetchRolePermissions() {
  return fetchJson<RolePermissionMap>(`${ADMIN_BASE}/roles/permissions`, {});
}

export async function updateRolePermission(roleId: string, permissionKey: string, enabled: boolean) {
  return fetchJson(`${ADMIN_BASE}/roles/${roleId}/permissions`, null, {
    method: enabled ? "POST" : "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify({ permissionKey }),
  });
}

// Modules & visibility
export async function fetchModuleToggles() {
  return fetchJson<ModuleToggle[]>(`${ADMIN_BASE}/modules`, []);
}

export async function updateModuleToggle(moduleId: string, enabled: boolean) {
  return fetchJson(`${ADMIN_BASE}/modules/${moduleId}`, null, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ enabled }),
  });
}

export async function fetchFieldVisibility() {
  return fetchJson<Record<string, string>>(`${ADMIN_BASE}/jbp/visibility`, {});
}

export async function updateFieldVisibility(payload: Record<string, string>) {
  return fetchJson(`${ADMIN_BASE}/jbp/visibility`, null, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

// Custom tables
export async function fetchCustomTables() {
  const raw = await fetchJson<any[]>(`${ADMIN_BASE}/custom/tables`, []);
  return (raw || []).map((t) => ({
    id: t.table_id ?? t.id ?? "",
    name: t.name ?? "",
    owner: "",
    fields: 0,
    lastUpdated: "",
  })) as CustomTable[];
}

export async function fetchSystemTables() {
  return fetchJson<SystemTable[]>(`${ADMIN_BASE}/system-tables`, []);
}

export async function createCustomTable(name: string) {
  return fetchJson<CustomTable | null>(`${ADMIN_BASE}/custom/tables`, null, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ name }),
  });
}

// Templates
export async function fetchTemplates() {
  const raw = await fetchJson<any[]>(`${ADMIN_BASE}/templates`, []);
  return (raw || []).map((t) => ({
    id: t.template_id ?? t.id ?? "",
    name: t.name ?? "",
    type: String(t.type || "EMAIL").toUpperCase().includes("CONTRACT") ? "contract" : "email",
    content: t.content ?? "",
    variables: [],
  })) as TemplateRecord[];
}

export async function updateTemplate(templateId: string, content: string) {
  return fetchJson(`${ADMIN_BASE}/templates/${templateId}`, null, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ content }),
  });
}

// Notifications
export async function fetchNotificationTriggers() {
  const raw = await fetchJson<any[]>(`${ADMIN_BASE}/notification/triggers`, []);
  return (raw || []).map((t) => ({
    id: t.trigger_id ?? t.id ?? "",
    event: t.event_name ?? t.event ?? "",
    template: String(t.template_id ?? ""),
    channels: { email: false, sms: false, push: false },
    active: true,
  })) as NotificationTrigger[];
}

export async function fetchNotificationConfig() {
  const services = await fetchJson<any[]>(`${ADMIN_BASE}/notification/services`, []);
  const cfg: NotificationConfig = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATION_CONFIG));
  services.forEach((s) => {
    const type = String(s.type || "").toUpperCase();
    const c = s.credentials || {};
    if (type === "SMTP") cfg.email = { host: c.host ?? "", port: Number(c.port ?? 0), from: c.from ?? "" };
    if (type.startsWith("SMS")) cfg.sms = { provider: c.provider ?? "", token: c.token ?? "" };
    if (type.startsWith("PUSH")) cfg.push = { provider: c.provider ?? "", apiKey: c.apiKey ?? "" };
  });
  return cfg;
}

export async function updateNotificationTrigger(triggerId: string, payload: Partial<NotificationTrigger>) {
  const { channels } = payload;
  const body: Record<string, unknown> = {};
  if (channels) {
    if (typeof channels.email === 'boolean') body.email = channels.email;
    if (typeof channels.sms === 'boolean') body.sms = channels.sms;
    if (typeof channels.push === 'boolean') body.push = channels.push;
  }
  return fetchJson(`${ADMIN_BASE}/notifications/triggers/${triggerId}`, null, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export async function updateNotificationConfig(channel: keyof NotificationConfig, payload: Record<string, unknown>) {
  const map: Record<string, string> = { email: "SMTP", sms: "SMS", push: "PUSH" };
  const type = map[channel] ?? channel.toUpperCase();
  return fetchJson(`${ADMIN_BASE}/notification/services/${type}`, null, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

// SLA
export async function fetchSlaSettings() {
  return fetchJson<SlaSettings>(`${ADMIN_BASE}/sla`, {
    workingHours: { start: "08:00", end: "18:00", weekDays: true },
    rules: [],
  });
}

export async function updateSlaSettings(payload: SlaSettings) {
  return fetchJson(`${ADMIN_BASE}/sla`, null, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

// Integrations
export async function fetchApiKeys() {
  const raw = await fetchJson<any[]>(`${ADMIN_BASE}/api-keys`, []);
  return (raw || []).map((k) => ({
    id: k.key_id ?? k.id ?? "",
    label: k.description ?? "",
    mask: `${k.prefix ?? ""}...`,
    createdAt: k.last_used_at ?? "",
  })) as ApiKey[];
}

export async function generateApiKey(description: string) {
  return fetchJson<ApiKey | null>(`${ADMIN_BASE}/api-keys`, null, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ description }),
  });
}

export async function revokeApiKey(keyId: string) {
  return fetchJson(`${ADMIN_BASE}/api-keys/${keyId}`, null, {
    method: "DELETE",
  });
}

export async function fetchWebhooks() {
  const raw = await fetchJson<any[]>(`${ADMIN_BASE}/webhooks`, []);
  return (raw || []).map((w) => ({
    id: w.webhook_id ?? w.id ?? "",
    event: w.event_name ?? w.event ?? "",
    url: w.target_url ?? w.url ?? "",
    active: String(w.status || "ACTIVE").toUpperCase() === "ACTIVE",
  })) as WebhookEndpoint[];
}

export async function addWebhook(event: string, url: string) {
  return fetchJson<WebhookEndpoint | null>(`${ADMIN_BASE}/webhooks`, null, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ event_name: event, target_url: url }),
  });
}

export async function toggleWebhook(webhookId: string, active: boolean) {
  return fetchJson(`${ADMIN_BASE}/webhooks/${webhookId}`, null, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ active }),
  });
}

// Audit log
export async function fetchAuditLog() {
  return fetchJson<AuditEntry[]>(`${ADMIN_BASE}/audit-log`, []);
}
