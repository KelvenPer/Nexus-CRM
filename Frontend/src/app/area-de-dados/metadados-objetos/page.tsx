"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PermissionsModal, { UserProfile } from "@/components/metadados/PermissionsModal";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

type MetaObjectRow = {
  metaId: string;
  nomeAmigavel: string;
  idObjeto: string;
  tipo: "BASE" | "CUSTOMIZADO";
  status: string;
  profiles: UserProfile[];
  fields: string[];
};

type FieldRow = {
  label: string;
  apiName: string;
  type: string;
  description: string;
  tags: string[];
};

const generateFallbackId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `meta-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toProfileList = (value: unknown): UserProfile[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return { id: item.trim(), name: item.trim() };
        }
        if (!isRecord(item)) {
          return null;
        }
        const idCandidate =
          item.id ?? item.profileId ?? item.slug ?? item.code ?? item.name ?? item.nome;
        const nameCandidate = item.name ?? item.nome ?? item.label ?? item.descricao;
        return idCandidate && nameCandidate
          ? { id: String(idCandidate), name: String(nameCandidate) }
          : null;
      })
      .filter((profile): profile is UserProfile => Boolean(profile));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => ({ id: entry, name: entry }));
  }

  return [];
};

const toCapitalized = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const normalizeMetaObject = (item: unknown, index: number): MetaObjectRow => {
  if (!isRecord(item)) {
    return {
      metaId: `${generateFallbackId()}-${index}`,
      nomeAmigavel: "Objeto sem nome",
      idObjeto: "",
      tipo: "CUSTOMIZADO",
      status: "Ativo",
      profiles: [],
      fields: [],
    };
  }

  const tipoValue = (item.tipo ?? item.kind ?? item.origin ?? "").toString().toUpperCase();
  const statusRaw = (item.status ?? item.lifecycle ?? "Ativo").toString();

  const fields =
    Array.isArray(item.fields) && item.fields.every((field) => typeof field === "string")
      ? (item.fields as string[])
      : [];

  return {
    metaId: String(item.metaId ?? item.id ?? item.objectId ?? `${generateFallbackId()}-${index}`),
    nomeAmigavel: (item.nomeAmigavel ?? item.name ?? "Objeto sem nome").toString(),
    idObjeto: String(item.idObjeto ?? item.slug ?? item.apiName ?? item.identifier ?? ""),
    tipo: tipoValue === "BASE" ? "BASE" : "CUSTOMIZADO",
    status: statusRaw ? toCapitalized(statusRaw) : "Ativo",
    profiles: toProfileList(item.perfis ?? item.profiles ?? item.allowedProfiles),
    fields,
  };
};

const statusClasses: Record<string, string> = {
  Ativo: "text-green-400 bg-green-400/10 border border-green-400/30",
  Rascunho: "text-yellow-300 bg-yellow-200/10 border border-yellow-300/20",
  Arquivado: "text-gray-300 bg-gray-300/10 border border-gray-400/20",
};

const TAB_LABELS = [
  { key: "fields", label: "Campos" },
  { key: "relationships", label: "Relacionamentos" },
  { key: "dictionary", label: "Dicionario de Dados" },
  { key: "rules", label: "Regras de Negocio" },
] as const;

export default function MetadadosObjetosPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<MetaObjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<MetaObjectRow | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MetaObjectRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TAB_LABELS)[number]["key"]>("fields");
  const [search, setSearch] = useState("");

  const fetchMetaObjects = useCallback(async () => {
    setErrorMessage(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/meta-objetos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Falha ao carregar objetos (${response.status})`);
      }

      const data = await response.json();
      const rawList: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown> | undefined)?.items)
        ? ((data as Record<string, unknown>).items as unknown[])
        : Array.isArray((data as Record<string, unknown> | undefined)?.objetos)
        ? ((data as Record<string, unknown>).objetos as unknown[])
        : [];

      const normalized = rawList.map((item, index) => normalizeMetaObject(item, index));
      setObjects(normalized);
      if (!selectedId && normalized.length) {
        setSelectedId(normalized[0].metaId);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Nao foi possivel carregar o catalogo de objetos.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchMetaObjects();
  }, [fetchMetaObjects]);

  const filteredObjects = useMemo(() => {
    if (!search.trim()) {
      return objects;
    }
    const lower = search.toLowerCase();
    return objects.filter(
      (object) =>
        object.nomeAmigavel.toLowerCase().includes(lower) ||
        object.idObjeto.toLowerCase().includes(lower)
    );
  }, [objects, search]);

  const selectedObject = useMemo(() => {
    if (!filteredObjects.length) {
      return null;
    }
    if (selectedId) {
      return filteredObjects.find((object) => object.metaId === selectedId) ?? filteredObjects[0];
    }
    return filteredObjects[0];
  }, [filteredObjects, selectedId]);

  useEffect(() => {
    if (!selectedId && filteredObjects.length) {
      setSelectedId(filteredObjects[0].metaId);
    }
  }, [filteredObjects, selectedId]);

  const handleSelectObject = (objectId: string) => {
    setSelectedId(objectId);
    setActiveTab("fields");
  };

  const handleDeleteObject = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/meta-objetos/${deleteTarget.metaId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Falha ao excluir (${response.status})`);
      }

      setObjects((prev) => prev.filter((object) => object.metaId !== deleteTarget.metaId));
      if (selectedId === deleteTarget.metaId) {
        setSelectedId(null);
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel excluir o objeto. Verifique se ele ainda alimenta dashboards.");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedFieldRows = useMemo((): FieldRow[] => {
    if (!selectedObject) return [];

    const source = selectedObject.fields.length
      ? selectedObject.fields
      : ["id", "nome", "status", "criado_em"];

    return source.map((field) => {
      const apiName = field.trim();
      const label = apiName
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const guessedType = apiName.includes("data")
        ? "Data"
        : apiName.includes("id")
        ? "ID"
        : apiName.includes("valor") || apiName.includes("numero")
        ? "Numero"
        : "Texto";

      const description = `Campo ${label.toLowerCase()} da entidade ${selectedObject.nomeAmigavel}.`;
      const tags = apiName.includes("id") ? ["Chave"] : apiName.includes("data") ? ["Auditoria"] : [];

      return {
        label,
        apiName,
        type: guessedType,
        description,
        tags,
      };
    });
  }, [selectedObject]);

  const relationshipHints = useMemo(() => {
    if (!selectedObject) return [];
    const title = selectedObject.nomeAmigavel;
    return [
      `1:N • ${title} possui vários Contatos vinculados.`,
      `N:1 • ${title} pertence a uma Região comercial.`,
      `1:1 • ${title} possui detalhe financeiro agregado.`,
    ];
  }, [selectedObject]);

  const dictionaryStats = useMemo(() => {
    if (!selectedObject) return [];
    return [
      { label: "Tipo do Objeto", value: selectedObject.tipo === "BASE" ? "Base" : "Customizado" },
      { label: "Status", value: selectedObject.status },
      { label: "ID Tecnico", value: selectedObject.idObjeto },
      { label: "Campos", value: selectedFieldRows.length.toString() },
      { label: "Perfis com acesso", value: selectedObject.profiles.length.toString() },
      {
        label: "Sensibilidade",
        value: selectedObject.idObjeto.includes("id") ? "Restrito (LGPD)" : "Publico Interno",
      },
    ];
  }, [selectedFieldRows.length, selectedObject]);

  const renderTabContent = () => {
    if (!selectedObject) return null;

    switch (activeTab) {
      case "fields":
        return (
          <div className="meta-table-wrapper">
            <table className="metadata-table">
              <thead>
                <tr>
                  <th>Rotulo</th>
                  <th>Nome da API</th>
                  <th>Tipo</th>
                  <th>Descricao</th>
                </tr>
              </thead>
              <tbody>
                {selectedFieldRows.map((field) => (
                  <tr key={field.apiName}>
                    <td className="font-medium text-white">{field.label}</td>
                    <td className="font-mono text-gray-300">{field.apiName}</td>
                    <td>
                      <span className="tag-pill">{field.type}</span>
                    </td>
                    <td className="text-gray-300">
                      {field.description}
                      {field.tags.length ? (
                        <span className="inline-flex items-center gap-1 ml-3 text-xs text-gray-400">
                          {field.tags.map((tag) => (
                            <span key={tag} className="tag-pill muted">
                              {tag}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "relationships":
        return (
          <div className="meta-relationships">
            {relationshipHints.map((hint) => (
              <div key={hint} className="relationship-item">
                {hint}
              </div>
            ))}
          </div>
        );
      case "dictionary":
        return (
          <div className="meta-dictionary">
            {dictionaryStats.map((stat) => (
              <div key={stat.label}>
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        );
      case "rules":
        return (
          <div className="meta-rules">
            <p className="text-gray-300 text-sm">
              Defina validações e gatilhos para este objeto diretamente na API de Metadados. Eles
              aparecerão aqui automaticamente.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-200">
              <li>• Validar CPF/CNPJ antes de salvar.</li>
              <li>• Bloquear alteração de status após fechamento.</li>
              <li>• Enviar alerta se valor exceder limite definido pelo Financeiro.</li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="meta-page">
        <aside className="meta-sidebar glass-panel">
          <div className="meta-sidebar-header">
            <div>
              <p className="eyebrow">Catálogo</p>
              <h2>Metadados (Objetos)</h2>
            </div>
            <div className="search-field">
              <input
                type="text"
                placeholder="Buscar objeto..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="meta-object-list">
            {isLoading ? (
              <div className="meta-feedback empty">Carregando objetos...</div>
            ) : errorMessage ? (
              <div className="meta-feedback error">{errorMessage}</div>
            ) : (
              filteredObjects.map((object) => {
                const isActive = selectedObject?.metaId === object.metaId;
                return (
                  <button
                    key={object.metaId}
                    type="button"
                    className={`meta-object-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelectObject(object.metaId)}
                  >
                    <div>
                      <p className="object-name">{object.nomeAmigavel}</p>
                      <p className="object-id">{object.idObjeto}</p>
                    </div>
                    <div className={`object-status ${statusClasses[object.status] ?? ""}`}>
                      {object.status}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <button type="button" className="primary-action w-full" onClick={() => router.push("/dados/estudio-sql")}>
            + Novo Objeto
          </button>
        </aside>

        <section className="meta-detail glass-panel">
          {selectedObject ? (
            <>
              <header className="meta-detail-header">
                <div>
                  <p className="eyebrow">{selectedObject.tipo === "BASE" ? "Objeto base" : "Customizado"}</p>
                  <h1>{selectedObject.nomeAmigavel}</h1>
                  <p className="text-gray-300">
                    Definição e governança para {selectedObject.nomeAmigavel}. Configure campos, relacionamentos e permissões.
                  </p>
                </div>
                <div className="meta-actions">
                  <button type="button" className="ghost-button" onClick={() => setSelectedId(null)}>
                    Limpar seleção
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setPermissionTarget(selectedObject);
                      setPermissionsOpen(true);
                    }}
                  >
                    Gerenciar permissões
                  </button>
                  <button type="button" className="ghost-button" onClick={() => router.push("/dados/estudio-sql")}>
                    Abrir no Estúdio SQL
                  </button>
                  <button type="button" className="danger-button" onClick={() => setDeleteTarget(selectedObject)}>
                    Excluir
                  </button>
                </div>
              </header>

              <nav className="meta-tabs">
                {TAB_LABELS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={activeTab === tab.key ? "active" : ""}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="meta-tab-content">{renderTabContent()}</div>
            </>
          ) : (
            <div className="meta-feedback empty">
              Selecione um objeto no painel lateral para visualizar os detalhes.
            </div>
          )}
        </section>
      </div>

      {permissionsOpen && permissionTarget ? (
        <PermissionsModal
          isOpen={permissionsOpen}
          objectName={permissionTarget.nomeAmigavel}
          currentProfileIds={permissionTarget.profiles.map((profile) => profile.id)}
          onClose={() => setPermissionsOpen(false)}
          onSave={(profiles) => {
            setObjects((prev) =>
              prev.map((object) =>
                object.metaId === permissionTarget.metaId ? { ...object, profiles } : object
              )
            );
            setPermissionsOpen(false);
          }}
        />
      ) : null}

      {deleteTarget && (
        <div className="meta-modal">
          <div className="meta-modal-card">
            <h3>Excluir {deleteTarget.nomeAmigavel}</h3>
            <p className="text-gray-300 text-sm">
              Confirme para remover <strong>{deleteTarget.nomeAmigavel}</strong>. Certifique-se de que nenhum dashboard dependa deste objeto.
            </p>
            <div className="meta-modal-actions">
              <button type="button" className="ghost-button" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="danger-button" onClick={handleDeleteObject} disabled={isDeleting}>
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
