'use client';

import AppShell from '@/components/layout/AppShell';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiKey,
  AuditEntry,
  ConfigSection,
  CustomTable,
  ModuleToggle,
  NotificationConfig,
  NotificationTrigger,
  PermissionModule,
  RoleGroup,
  RolePermissionMap,
  SlaRule,
  SlaSettings,
  SystemTable,
  TemplateRecord,
  UserPayload,
  UserRecord,
  UserStatus,
  WebhookEndpoint,
  addWebhook,
  createCustomTable,
  fetchApiKeys,
  fetchAuditLog,
  fetchCustomTables,
  fetchFieldVisibility,
  fetchModuleToggles,
  fetchNotificationConfig,
  fetchNotificationTriggers,
  fetchPermissionMatrix,
  fetchRoleGroups,
  fetchRolePermissions,
  fetchSlaSettings,
  fetchSystemTables,
  fetchTemplates,
  fetchUsers,
  fetchWebhooks,
  generateApiKey,
  revokeApiKey,
  saveUser,
  toggleWebhook,
  updateFieldVisibility,
  updateModuleToggle,
  updateNotificationConfig,
  updateNotificationTrigger,
  updateRolePermission,
  updateSlaSettings,
  updateTemplate,
  updateUserStatus,
} from '@/lib/services/adminConfig';

const sidebarSections: { id: ConfigSection; label: string; description: string }[] = [
  { id: 'usuarios', label: 'Usuários', description: 'Convide, edite e inative acessos' },
  { id: 'permissoes', label: 'Funções e Permissões', description: 'Perfis e matriz de acesso' },
  { id: 'dados', label: 'Gestão de Dados', description: 'Tabelas e campos customizados' },
  { id: 'templates', label: 'Templates', description: 'Contratos e comunicações padrão' },
  { id: 'notificacoes', label: 'Notificações', description: 'Email, SMS e push' },
  { id: 'sla', label: 'Regras de SLA', description: 'Tempos de resposta e solução' },
  { id: 'configuracoes', label: 'Configurações Gerais', description: 'Módulos e campos sensíveis' },
  { id: 'integracoes', label: 'Integrações & API', description: 'Chaves, webhooks e SDK' },
  { id: 'logs', label: 'Log de Atividades', description: 'Auditoria completa' },
];

const notificationTabs = [
  { id: 'gatilhos', label: 'Gatilhos' },
  { id: 'email', label: 'Config. Email (SMTP)' },
  { id: 'sms', label: 'Config. SMS' },
  { id: 'push', label: 'Config. Push' },
] as const;

type NotificationTabId = (typeof notificationTabs)[number]['id'];
type NotificationChannelTab = Extract<NotificationTabId, keyof NotificationConfig>;

const notificationChannelFields: Record<
  NotificationChannelTab,
  Array<{ field: string; label: string; type?: 'text' | 'number'; helper?: string }>
> = {
  email: [
    { field: 'host', label: 'Servidor SMTP' },
    { field: 'port', label: 'Porta', type: 'number' },
    { field: 'from', label: 'Remetente padrão' },
  ],
  sms: [
    { field: 'provider', label: 'Fornecedor (Ex: Twilio)' },
    { field: 'token', label: 'Token/API Key' },
  ],
  push: [
    { field: 'provider', label: 'Provider (Ex: Firebase)' },
    { field: 'apiKey', label: 'API Key' },
  ],
};

const viewFieldOptions: Record<string, string[]> = {
  investimento: ['Admin e Gerente de Trade', 'Somente Administrador', 'Todos (não recomendado)'],
  faturamento: ['Admin e Gerente de Trade', 'Somente Administrador', 'Todos'],
  contrato: ['Todos (Visível para Campo)', 'Admin e Gerente de Trade', 'Somente Administrador'],
};

const viewFieldLabels: Record<string, string> = {
  investimento: "Ver 'Investimento Total (Budget)'",
  faturamento: "Ver 'Meta Faturamento (Período)'",
  contrato: "Ver aba 'Contrato e Anexos'",
};

const userRoles: UserPayload['role'][] = ['Administrador', 'Gerente de Trade', 'Analista de Dados', 'Assistente de Trade', 'Visitante'];

const userStatusStyle: Record<UserStatus, string> = {
  Ativo: 'badge success',
  Inativo: 'badge muted',
};

const priorityOrder: SlaRule['priority'][] = ['Alta', 'Media', 'Baixa'];

const defaultSlaRule = (priority: SlaRule['priority']): SlaRule => ({
  priority,
  responseTime: priority === 'Alta' ? 4 : priority === 'Media' ? 8 : 12,
  responseUnit: 'h',
  resolutionTime: priority === 'Alta' ? 24 : priority === 'Media' ? 48 : 72,
  resolutionUnit: 'h',
});

const auditFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ConfiguracoesPage() {
  const [activeSection, setActiveSection] = useState<ConfigSection>('usuarios');
  const [notificationTab, setNotificationTab] = useState<NotificationTabId>('gatilhos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [moduleToggles, setModuleToggles] = useState<ModuleToggle[]>([]);
  const [viewPermissions, setViewPermissions] = useState<Record<string, string>>({});
  const [customTables, setCustomTables] = useState<CustomTable[]>([]);
  const [systemTables, setSystemTables] = useState<SystemTable[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [notificationTriggers, setNotificationTriggers] = useState<NotificationTrigger[]>([]);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    email: { host: '', port: 0, from: '' },
    sms: { provider: '', token: '' },
    push: { provider: '', apiKey: '' },
  });
  const [slaSettings, setSlaSettings] = useState<SlaSettings>({
    workingHours: { start: '08:00', end: '18:00', weekDays: true },
    rules: priorityOrder.map((priority) => defaultSlaRule(priority)),
  });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [roleGroups, setRoleGroups] = useState<RoleGroup[]>([]);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>({});
  const [activeRoleId, setActiveRoleId] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [userInFocus, setUserInFocus] = useState<UserRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        usersData,
        moduleData,
        visibilityData,
        customTablesData,
        systemTablesData,
        templatesData,
        triggersData,
        notificationConfigData,
        slaData,
        apiKeysData,
        webhooksData,
        auditData,
        rolesData,
        modulesMatrixData,
        rolePermissionsData,
      ] = await Promise.all([
        fetchUsers(),
        fetchModuleToggles(),
        fetchFieldVisibility(),
        fetchCustomTables(),
        fetchSystemTables(),
        fetchTemplates(),
        fetchNotificationTriggers(),
        fetchNotificationConfig(),
        fetchSlaSettings(),
        fetchApiKeys(),
        fetchWebhooks(),
        fetchAuditLog(),
        fetchRoleGroups(),
        fetchPermissionMatrix(),
        fetchRolePermissions(),
      ]);

      setUsers(usersData);
      setModuleToggles(moduleData);
      setViewPermissions(visibilityData);
      setCustomTables(customTablesData);
      setSystemTables(systemTablesData);
      setTemplates(templatesData);
      setActiveTemplateId((prev) => prev || templatesData[0]?.id || '');
      setNotificationTriggers(triggersData);
      setNotificationConfig(notificationConfigData);
      const normalizedRules = priorityOrder.map(
        (priority) => slaData.rules.find((rule) => rule.priority === priority) ?? defaultSlaRule(priority),
      );
      setSlaSettings({ ...slaData, rules: normalizedRules });
      setApiKeys(apiKeysData);
      setWebhooks(webhooksData);
      setAuditLog(auditData);
      setRoleGroups(rolesData);
      setPermissionModules(modulesMatrixData);
      const map: Record<string, Set<string>> = {};
      Object.entries(rolePermissionsData as RolePermissionMap).forEach(([roleId, permissions]) => {
        map[roleId] = new Set(permissions);
      });
      setRolePermissions(map);
      setActiveRoleId((prev) => prev || rolesData[0]?.id || '');
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as configurações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sectionMeta = useMemo(() => sidebarSections.find((item) => item.id === activeSection), [activeSection]);
  const selectedRole = useMemo(() => roleGroups.find((role) => role.id === activeRoleId) ?? null, [activeRoleId, roleGroups]);
  const selectedRolePermissions = rolePermissions[activeRoleId] ?? new Set<string>();
  const activeTemplate = templates.find((tpl) => tpl.id === activeTemplateId) ?? null;

  const handleUserSave = async (payload: UserPayload) => {
    const saved = await saveUser(payload);
    if (!saved) return;
    setUsers((prev) => {
      const exists = prev.some((user) => user.id === saved.id);
      return exists ? prev.map((user) => (user.id === saved.id ? saved : user)) : [saved, ...prev];
    });
  };

  const handleStatusToggle = async (userId: string) => {
    const target = users.find((user) => user.id === userId);
    if (!target) return;
    const updated = await updateUserStatus(userId, target.status === 'Ativo' ? 'Inativo' : 'Ativo');
    if (!updated) return;
    setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
  };

  const handlePermissionToggle = async (roleId: string, permissionKey: string) => {
    if (!roleId) return;
    const current = rolePermissions[roleId] ?? new Set<string>();
    const enable = !current.has(permissionKey);
    await updateRolePermission(roleId, permissionKey, enable);
    setRolePermissions((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (enable) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }
      return { ...prev, [roleId]: next };
    });
  };

  const handleModuleToggle = async (moduleId: string) => {
    const toggle = moduleToggles.find((item) => item.id === moduleId);
    if (!toggle) return;
    await updateModuleToggle(moduleId, !toggle.enabled);
    setModuleToggles((prev) => prev.map((item) => (item.id === moduleId ? { ...item, enabled: !item.enabled } : item)));
  };

  const handleViewPermissionChange = (key: string, value: string) => {
    setViewPermissions((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveViewPermissions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await updateFieldVisibility(viewPermissions);
  };

  const handleCreateTable = async () => {
    const created = await createCustomTable(`Tabela Custom ${customTables.length + 1}`);
    if (!created) return;
    setCustomTables((prev) => [...prev, created]);
  };

  const handleTemplateContentChange = (content: string) => {
    if (!activeTemplate) return;
    setTemplates((prev) => prev.map((tpl) => (tpl.id === activeTemplate.id ? { ...tpl, content } : tpl)));
  };

  const handleTemplateSave = async () => {
    if (!activeTemplate) return;
    await updateTemplate(activeTemplate.id, activeTemplate.content);
  };

  const handleTriggerChannelToggle = async (triggerId: string, channel: keyof NotificationTrigger['channels']) => {
    const trigger = notificationTriggers.find((item) => item.id === triggerId);
    if (!trigger) return;
    const nextChannels = { ...trigger.channels, [channel]: !trigger.channels[channel] };
    await updateNotificationTrigger(triggerId, { channels: nextChannels });
    setNotificationTriggers((prev) => prev.map((item) => (item.id === triggerId ? { ...item, channels: nextChannels } : item)));
  };

  const handleTriggerStatusToggle = async (triggerId: string) => {
    const trigger = notificationTriggers.find((item) => item.id === triggerId);
    if (!trigger) return;
    await updateNotificationTrigger(triggerId, { active: !trigger.active });
    setNotificationTriggers((prev) => prev.map((item) => (item.id === triggerId ? { ...item, active: !item.active } : item)));
  };

  const handleLocalChannelConfigChange = (channel: NotificationChannelTab, field: string, value: string | number) => {
    setNotificationConfig((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [field]: value,
      },
    }));
  };

  const persistChannelConfig = async (channel: NotificationChannelTab, field: string, value: string | number) => {
    await updateNotificationConfig(channel, { [field]: value });
  };

  const handleSlaWorkingHoursChange = (field: 'start' | 'end' | 'weekDays', value: string | boolean) => {
    setSlaSettings((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [field]: value,
      },
    }));
  };

  const handleSlaRuleChange = (priority: SlaRule['priority'], field: 'responseTime' | 'responseUnit' | 'resolutionTime' | 'resolutionUnit', value: string) => {
    setSlaSettings((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) =>
        rule.priority === priority
          ? {
              ...rule,
              [field]: field.includes('Time') ? Number(value) : (value as SlaRule['responseUnit']),
            }
          : rule,
      ),
    }));
  };

  const handleSlaSave = async () => {
    await updateSlaSettings(slaSettings);
  };

  const handleGenerateApiKey = async () => {
    const created = await generateApiKey('Nova chave');
    if (!created) return;
    setApiKeys((prev) => [created, ...prev]);
  };

  const handleRevokeApiKey = async (keyId: string) => {
    await revokeApiKey(keyId);
    setApiKeys((prev) => prev.filter((key) => key.id !== keyId));
  };

  const handleAddWebhook = async () => {
    const created = await addWebhook('custom.event', 'https://hooks.seudominio.com/payload');
    if (!created) return;
    setWebhooks((prev) => [...prev, created]);
  };

  const handleWebhookToggle = async (webhookId: string) => {
    const webhook = webhooks.find((item) => item.id === webhookId);
    if (!webhook) return;
    await toggleWebhook(webhookId, !webhook.active);
    setWebhooks((prev) => prev.map((item) => (item.id === webhookId ? { ...item, active: !item.active } : item)));
  };

  const openUserModal = (user?: UserRecord) => {
    setUserInFocus(user ?? null);
    setUserModalOpen(true);
  };

  const closeUserModal = () => {
    setUserModalOpen(false);
    setUserInFocus(null);
  };

  const openPasswordModal = (user: UserRecord) => {
    setUserInFocus(user);
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setUserInFocus(null);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="panel p-8 text-center text-sm text-gray-500">Carregando configurações...</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="panel p-8 text-center text-sm text-red-500 space-y-4">
          <p>{error}</p>
          <button type="button" className="primary-button" onClick={loadData}>
            Tentar novamente
          </button>
        </div>
      </AppShell>
    );
  }

  const renderUsersSection = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Gerenciamento de usuários</p>
          <h3>Controle completo de acessos</h3>
        </div>
        <button type="button" className="primary-button" onClick={() => openUserModal()}>
          Novo usuário
        </button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Função</th>
              <th>Status</th>
              <th aria-label="ações" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.nome}</strong>
                  <p className="muted">{user.email}</p>
                </td>
                <td>{user.role}</td>
                <td>
                  <span className={userStatusStyle[user.status]}>{user.status}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="link-button" onClick={() => openUserModal(user)}>
                      Editar
                    </button>
                    <button type="button" className="link-button" onClick={() => openPasswordModal(user)}>
                      Resetar senha
                    </button>
                    <button type="button" className="ghost-button" onClick={() => handleStatusToggle(user.id)}>
                      {user.status === 'Ativo' ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <div className="empty-state">Nenhum usuário cadastrado.</div>}
      </div>
    </div>
  );

  const renderPermissionsSection = () => (
    <div className="config-columns">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Perfis</p>
            <h3>Funções disponíveis</h3>
          </div>
        </div>
        <div className="role-list">
          {roleGroups.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`role-chip ${role.id === activeRoleId ? 'is-active' : ''}`}
              onClick={() => setActiveRoleId(role.id)}
            >
              <div>
                <strong>{role.name}</strong>
                <p className="muted text-xs">{role.description}</p>
              </div>
              {!role.editable && <span className="badge muted">System</span>}
            </button>
          ))}
          {!roleGroups.length && <div className="empty-state">Nenhum grupo cadastrado.</div>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Matriz de permissões</p>
            <h3>{selectedRole ? selectedRole.name : 'Selecione um grupo'}</h3>
            {selectedRole && (
              <p className="muted text-sm">{selectedRole.editable ? 'Marque os módulos liberados' : 'Perfil padrão - não editável'}</p>
            )}
          </div>
        </div>
        {selectedRole ? (
          <div className="permission-modules">
            {permissionModules.map((module) => (
              <div key={module.id} className="permission-block">
                <div className="permission-header">
                  <strong>{module.name}</strong>
                </div>
                <div className="permission-grid">
                  {module.toggles.map((toggle) => (
                    <label key={toggle.id} className={`permission-line ${toggle.disabled ? 'is-disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedRolePermissions.has(toggle.id)}
                        disabled={toggle.disabled || !selectedRole.editable}
                        onChange={() => handlePermissionToggle(selectedRole.id, toggle.id)}
                      />
                      <span>{toggle.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Selecione uma função para editar permissões.</div>
        )}
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="config-columns">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Tabelas customizadas</p>
            <h3>Objetos criados pelos analistas</h3>
          </div>
          <button type="button" className="primary-button" onClick={handleCreateTable}>
            Nova tabela
          </button>
        </div>
        <ul className="data-list">
          {customTables.map((table) => (
            <li key={table.id}>
              <div>
                <strong>{table.name}</strong>
                <p className="muted text-sm">
                  {table.fields} campos • Atualizado em {table.lastUpdated}
                </p>
              </div>
              <span className="badge">{table.owner}</span>
            </li>
          ))}
        </ul>
        {!customTables.length && <div className="empty-state">Nenhuma tabela customizada criada.</div>}
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Tabelas core</p>
            <h3>Modelos da plataforma</h3>
          </div>
        </div>
        <ul className="data-list">
          {systemTables.map((table) => (
            <li key={table.id}>
              <div>
                <strong>{table.name}</strong>
                <p className="muted text-sm">{table.description}</p>
              </div>
              <button type="button" className="link-button">
                Configurar campos
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderTemplatesSection = () => (
    <div className="config-columns">
      <div className="panel templates-list">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Templates</p>
            <h3>Modelos disponíveis</h3>
          </div>
        </div>
        <div className="template-nav">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`template-chip ${template.id === activeTemplateId ? 'is-active' : ''}`}
              onClick={() => setActiveTemplateId(template.id)}
            >
              <strong>{template.name}</strong>
              <span className="muted text-xs">{template.type === 'contract' ? 'Contrato' : 'Email'}</span>
            </button>
          ))}
          {!templates.length && <div className="empty-state">Nenhum template cadastrado.</div>}
        </div>
      </div>
      <div className="panel templates-editor">
        {activeTemplate ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Editando template</p>
                <h3>{activeTemplate.name}</h3>
              </div>
              <button type="button" className="primary-button" onClick={handleTemplateSave}>
                Salvar template
              </button>
            </div>
            <div className="template-editor-grid">
              <label className="editor-field">
                <span>Conteúdo (Markdown/HTML)</span>
                <textarea value={activeTemplate.content} onChange={(event) => handleTemplateContentChange(event.target.value)} rows={18} />
              </label>
              <div className="template-variables">
                <p className="eyebrow">Variáveis</p>
                <ul>
                  {activeTemplate.variables.map((variable) => (
                    <li key={variable}>
                      <code>{`{{ ${variable} }}`}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">Selecione um template para editar.</div>
        )}
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Automação de comunicações</p>
          <h3>Notificações e gatilhos</h3>
        </div>
      </div>
      <div className="tabs">
        {notificationTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${notificationTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setNotificationTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {notificationTab === 'gatilhos' ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Template</th>
                <th>Email</th>
                <th>SMS</th>
                <th>Push</th>
                <th>Status</th>
                <th aria-label="ações" />
              </tr>
            </thead>
            <tbody>
              {notificationTriggers.map((trigger) => (
                <tr key={trigger.id}>
                  <td>{trigger.event}</td>
                  <td>{trigger.template}</td>
                  {(['email', 'sms', 'push'] as const).map((channel) => (
                    <td key={channel}>
                      <button
                        type="button"
                        className={`channel-dot ${trigger.channels[channel] ? 'active' : ''}`}
                        onClick={() => handleTriggerChannelToggle(trigger.id, channel)}
                        aria-pressed={trigger.channels[channel]}
                      >
                        {channel.toUpperCase()}
                      </button>
                    </td>
                  ))}
                  <td>
                    <button type="button" className="badge" onClick={() => handleTriggerStatusToggle(trigger.id)}>
                      {trigger.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td>
                    <button type="button" className="link-button">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!notificationTriggers.length && <div className="empty-state">Nenhum gatilho configurado.</div>}
        </div>
      ) : (
        <div className="notification-form">
          {notificationChannelFields[notificationTab as NotificationChannelTab]?.map((fieldDef) => (
            <label key={fieldDef.field}>
              <span>{fieldDef.label}</span>
              <input
                type={fieldDef.type ?? 'text'}
                value={String(
                  notificationConfig[notificationTab as NotificationChannelTab][fieldDef.field as keyof NotificationConfig[NotificationChannelTab]] ?? '',
                )}
                onChange={(event) =>
                  handleLocalChannelConfigChange(
                    notificationTab as NotificationChannelTab,
                    fieldDef.field,
                    fieldDef.type === 'number' ? Number(event.target.value) : event.target.value,
                  )
                }
                onBlur={(event) =>
                  persistChannelConfig(
                    notificationTab as NotificationChannelTab,
                    fieldDef.field,
                    fieldDef.type === 'number' ? Number(event.target.value) : event.target.value,
                  )
                }
              />
              {fieldDef.helper && <small className="muted">{fieldDef.helper}</small>}
            </label>
          ))}
        </div>
      )}
    </div>
  );

  const renderSlaSection = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SLA de atendimento</p>
          <h3>Janelas de resposta e solução</h3>
        </div>
        <button type="button" className="primary-button" onClick={handleSlaSave}>
          Salvar regras
        </button>
      </div>
      <div className="sla-working-hours">
        <div>
          <label>
            <span>Início</span>
            <input type="time" value={slaSettings.workingHours.start} onChange={(event) => handleSlaWorkingHoursChange('start', event.target.value)} />
          </label>
        </div>
        <div>
          <label>
            <span>Fim</span>
            <input type="time" value={slaSettings.workingHours.end} onChange={(event) => handleSlaWorkingHoursChange('end', event.target.value)} />
          </label>
        </div>
        <label className="checkbox-line">
          <input type="checkbox" checked={!!slaSettings.workingHours.weekDays} onChange={(event) => handleSlaWorkingHoursChange('weekDays', event.target.checked)} />
          <span>Somente dias úteis</span>
        </label>
      </div>
      <div className="sla-grid">
        {priorityOrder.map((priority) => {
          const rule = slaSettings.rules.find((item) => item.priority === priority) ?? defaultSlaRule(priority);
          return (
            <div key={priority} className="sla-card">
              <p className="eyebrow">Prioridade {priority.toUpperCase()}</p>
              <div className="sla-fields">
                <label>
                  <span>1ª resposta</span>
                  <input type="number" min={0} value={rule.responseTime} onChange={(event) => handleSlaRuleChange(priority, 'responseTime', event.target.value)} />
                </label>
                <label>
                  <span>Unidade</span>
                  <select value={rule.responseUnit} onChange={(event) => handleSlaRuleChange(priority, 'responseUnit', event.target.value)}>
                    <option value="min">Minutos</option>
                    <option value="h">Horas</option>
                    <option value="d">Dias</option>
                  </select>
                </label>
                <label>
                  <span>Solução</span>
                  <input
                    type="number"
                    min={0}
                    value={rule.resolutionTime}
                    onChange={(event) => handleSlaRuleChange(priority, 'resolutionTime', event.target.value)}
                  />
                </label>
                <label>
                  <span>Unidade</span>
                  <select value={rule.resolutionUnit} onChange={(event) => handleSlaRuleChange(priority, 'resolutionUnit', event.target.value)}>
                    <option value="min">Minutos</option>
                    <option value="h">Horas</option>
                    <option value="d">Dias</option>
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSystemConfigSection = () => (
    <div className="config-columns">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Módulos</p>
            <h3>Ativação por tenant</h3>
          </div>
        </div>
        <ul className="toggle-list">
          {moduleToggles.map((toggle) => (
            <li key={toggle.id}>
              <div>
                <strong>{toggle.label}</strong>
                <p className="muted text-sm">{toggle.description}</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={toggle.enabled} onChange={() => handleModuleToggle(toggle.id)} />
                <span />
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Campos sensíveis</p>
            <h3>Visibilidade padrão JBP</h3>
          </div>
        </div>
        <form className="sensitive-form" onSubmit={handleSaveViewPermissions}>
          {Object.keys(viewFieldOptions).map((key) => (
            <label key={key}>
              <span>{viewFieldLabels[key]}</span>
              <select value={viewPermissions[key] ?? viewFieldOptions[key][0]} onChange={(event) => handleViewPermissionChange(key, event.target.value)}>
                {viewFieldOptions[key].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="form-footer">
            <button type="submit" className="primary-button">
              Salvar visibilidade
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderIntegrationsSection = () => (
    <div className="config-columns">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Chaves REST</p>
            <h3>API Keys</h3>
          </div>
          <button type="button" className="primary-button" onClick={handleGenerateApiKey}>
            Gerar chave
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Prefixo</th>
                <th>Último uso</th>
                <th aria-label="ações" />
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td>{key.label}</td>
                  <td>
                    <code>{key.prefix}</code>
                  </td>
                  <td>{key.lastUsedAt ? auditFormatter.format(new Date(key.lastUsedAt)) : 'Nunca'}</td>
                  <td>
                    <button type="button" className="link-button danger" onClick={() => handleRevokeApiKey(key.id)}>
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!apiKeys.length && <div className="empty-state">Nenhuma chave criada.</div>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Webhooks</p>
            <h3>Eventos de saída</h3>
          </div>
          <button type="button" className="ghost-button" onClick={handleAddWebhook}>
            Novo webhook
          </button>
        </div>
        <ul className="data-list">
          {webhooks.map((hook) => (
            <li key={hook.id}>
              <div>
                <strong>{hook.event}</strong>
                <p className="muted text-sm">{hook.target}</p>
              </div>
              <div className="table-actions">
                <label className="switch small">
                  <input type="checkbox" checked={hook.active} onChange={() => handleWebhookToggle(hook.id)} />
                  <span />
                </label>
                <button type="button" className="link-button">
                  Logs
                </button>
              </div>
            </li>
          ))}
        </ul>
        {!webhooks.length && <div className="empty-state">Nenhum webhook configurado.</div>}
      </div>
    </div>
  );

  const renderLogsSection = () => (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Auditoria</p>
          <h3>Últimas ações</h3>
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Horário</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.map((entry) => (
              <tr key={entry.id}>
                <td>{auditFormatter.format(new Date(entry.timestamp))}</td>
                <td>{entry.user}</td>
                <td>{entry.action}</td>
                <td>
                  <div>
                    <strong>{entry.entityType}</strong>
                    <p className="muted text-xs">{entry.details}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!auditLog.length && <div className="empty-state">Nenhum evento registrado.</div>}
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'usuarios':
        return renderUsersSection();
      case 'permissoes':
        return renderPermissionsSection();
      case 'dados':
        return renderDataSection();
      case 'templates':
        return renderTemplatesSection();
      case 'notificacoes':
        return renderNotificationsSection();
      case 'sla':
        return renderSlaSection();
      case 'configuracoes':
        return renderSystemConfigSection();
      case 'integracoes':
        return renderIntegrationsSection();
      case 'logs':
        return renderLogsSection();
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="config-layout">
        <aside className="config-sidebar">
          <div className="config-sidebar-header">
            <p className="eyebrow">Admin</p>
            <h2>Módulo de Configuração</h2>
          </div>
          <nav>
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`config-link ${activeSection === section.id ? 'is-active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <div>
                  <strong>{section.label}</strong>
                  <p className="muted text-xs">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </aside>
        <section className="config-content">
          <header className="config-header">
            <div>
              <p className="eyebrow">Console multi-tenant</p>
              <h1>{sectionMeta?.label ?? 'Configurações'}</h1>
              <p className="muted">{sectionMeta?.description}</p>
            </div>
            <div className="config-stats">
              <div>
                <p className="muted text-xs">Usuários ativos</p>
                <strong>{users.filter((user) => user.status === 'Ativo').length}</strong>
              </div>
              <div>
                <p className="muted text-xs">Roles</p>
                <strong>{roleGroups.length}</strong>
              </div>
              <div>
                <p className="muted text-xs">Webhooks</p>
                <strong>{webhooks.length}</strong>
              </div>
            </div>
          </header>
          <div className="config-section">{renderActiveSection()}</div>
        </section>
      </div>

      <UserModal
        open={userModalOpen}
        user={userInFocus}
        roles={userRoles}
        onClose={closeUserModal}
        onSave={async (payload) => {
          await handleUserSave(payload);
          closeUserModal();
        }}
      />

      <PasswordModal open={passwordModalOpen} user={userInFocus} onClose={closePasswordModal} onConfirm={closePasswordModal} />
    </AppShell>
  );
}

type UserModalProps = {
  open: boolean;
  user: UserRecord | null;
  roles: UserPayload['role'][];
  onClose: () => void;
  onSave: (payload: UserPayload) => Promise<void>;
};

function UserModal({ open, user, roles, onClose, onSave }: UserModalProps) {
  const [formState, setFormState] = useState<UserPayload>({
    id: undefined,
    nome: '',
    email: '',
    role: roles[0] ?? 'Analista de Dados',
    status: 'Ativo',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (user) {
      setFormState({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } else {
      setFormState({
        id: undefined,
        nome: '',
        email: '',
        role: roles[0] ?? 'Analista de Dados',
        status: 'Ativo',
        password: '',
      });
    }
  }, [open, user, roles]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(formState);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{user ? 'Editar usuário' : 'Novo usuário'}</h3>
          <button type="button" className="ghost-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <label>
            <span>Nome completo</span>
            <input type="text" value={formState.nome} onChange={(event) => setFormState((prev) => ({ ...prev, nome: event.target.value }))} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={formState.email} onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))} required />
          </label>
          <label>
            <span>Função</span>
            <select value={formState.role} onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value as UserPayload['role'] }))}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          {!user && (
            <label>
              <span>Senha provisória</span>
              <input
                type="password"
                value={formState.password ?? ''}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                required
                minLength={6}
              />
            </label>
          )}
          <label className="checkbox-line">
            <input type="checkbox" checked={formState.status === 'Ativo'} onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.checked ? 'Ativo' : 'Inativo' }))} />
            <span>Usuário ativo</span>
          </label>
          <div className="modal-footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type PasswordModalProps = {
  open: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onConfirm: () => void;
};

function PasswordModal({ open, user, onClose, onConfirm }: PasswordModalProps) {
  if (!open || !user) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Resetar senha</h3>
          <button type="button" className="ghost-button" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="modal-body space-y-4">
          <p>
            Enviar link de redefinição para <strong>{user.email}</strong>?
          </p>
          <div className="modal-footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={onConfirm}>
              Enviar link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
