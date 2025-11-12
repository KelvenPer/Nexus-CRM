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
      metaId: generateFallbackId() + index,
      nomeAmigavel: "Objeto sem nome",
      idObjeto: "",
      tipo: "CUSTOMIZADO",
      status: "Ativo",
      profiles: [],
    };
  }

  const tipoValue = (item.tipo ?? item.kind ?? item.origin ?? "").toString().toUpperCase();
  const statusRaw = (item.status ?? item.lifecycle ?? "Ativo").toString();

  return {
    metaId: String(item.metaId ?? item.id ?? item.objectId ?? `${generateFallbackId()}-${index}`),
    nomeAmigavel: (item.nomeAmigavel ?? item.name ?? "Objeto sem nome").toString(),
    idObjeto: String(item.idObjeto ?? item.slug ?? item.apiName ?? item.identifier ?? ""),
    tipo: tipoValue === "BASE" ? "BASE" : "CUSTOMIZADO",
    status: statusRaw ? toCapitalized(statusRaw) : "Ativo",
    profiles: toProfileList(item.perfis ?? item.profiles ?? item.allowedProfiles),
  };
};

const statusClasses: Record<string, string> = {
  Ativo: "text-green-400 bg-green-400/10 border border-green-400/30",
  Rascunho: "text-yellow-300 bg-yellow-200/10 border border-yellow-300/20",
  Arquivado: "text-gray-300 bg-gray-300/10 border border-gray-400/20",
};

export default function MetadadosObjetosPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<MetaObjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<MetaObjectRow | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MetaObjectRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMetaObjects = useCallback(async () => {
    setRefreshing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/meta-objetos`);
      if (!response.ok) {
        throw new Error(`Falha ao carregar objetos (${response.status})`);
      }

      const data = await response.json();
      const rawList: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown> | undefined)?.items)
        ? (data as Record<string, unknown>).items as unknown[]
        : Array.isArray((data as Record<string, unknown> | undefined)?.objetos)
        ? (data as Record<string, unknown>).objetos as unknown[]
        : [];

      const normalized = rawList.map((item, index) => normalizeMetaObject(item, index));
      setObjects(normalized);
    } catch (error) {
      console.error(error);
      setErrorMessage("Nao foi possivel carregar o catalogo de objetos.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetaObjects();
  }, [fetchMetaObjects]);

  const handleOpenPermissions = (row: MetaObjectRow) => {
    setSelectedObject(row);
    setPermissionsOpen(true);
  };

  const closePermissionsModal = () => {
    setPermissionsOpen(false);
    setSelectedObject(null);
  };

  const handleEdit = (row: MetaObjectRow) => {
    if (row.tipo === "BASE") {
      return;
    }
    router.push(`/dados/estudio-sql?id=${row.idObjeto}`);
  };

  const handleDeleteRequest = (row: MetaObjectRow) => {
    if (row.tipo === "BASE") {
      return;
    }
    setDeleteTarget(row);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setIsDeleting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/meta-objetos/${deleteTarget.metaId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Falha ao excluir (${response.status})`);
      }

      setObjects((prev) => prev.filter((object) => object.metaId !== deleteTarget.metaId));
      closeDeleteDialog();
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel excluir o objeto. Verifique se ele nao esta em uso.");
      setIsDeleting(false);
    }
  };

  const handleSavePermissions = async (profiles: UserProfile[]) => {
    if (!selectedObject) return;

    const profileIds = profiles.map((profile) => profile.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/dados/meta-objetos/${selectedObject.metaId}/permissoes`,
        {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: profileIds }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao salvar permissoes (${response.status})`);
      }

      setObjects((prev) =>
        prev.map((object) =>
          object.metaId === selectedObject.metaId ? { ...object, profiles } : object
        )
      );
      setSelectedObject((prev) => (prev ? { ...prev, profiles } : prev));
      closePermissionsModal();
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel atualizar as permissoes.");
      throw error;
    }
  };

  const totalCustomObjects = useMemo(
    () => objects.filter((object) => object.tipo === "CUSTOMIZADO").length,
    [objects]
  );

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={6} className="py-12 text-center text-gray-400">
            Carregando catalogo...
          </td>
        </tr>
      );
    }

    if (errorMessage) {
      return (
        <tr>
          <td colSpan={6} className="py-6 text-center text-red-300">
            {errorMessage}
          </td>
        </tr>
      );
    }

    if (!objects.length) {
      return (
        <tr>
          <td colSpan={6} className="py-10 text-center text-gray-400">
            Nenhum objeto cadastrado ainda.
          </td>
        </tr>
      );
    }

    return objects.map((object) => (
      <tr key={object.metaId}>
        <td>
          <div>
            <p className="font-medium text-white">{object.nomeAmigavel}</p>
            <p className="text-xs text-gray-400">{object.tipo === "BASE" ? "Fonte base" : "Customizado"}</p>
          </div>
        </td>
        <td className="font-mono text-sm text-gray-300">{object.idObjeto}</td>
        <td>
          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              object.tipo === "BASE"
                ? "text-blue-300 border-blue-400/40 bg-blue-400/10"
                : "text-purple-300 border-purple-400/40 bg-purple-400/10"
            }`}
          >
            {object.tipo}
          </span>
        </td>
        <td>
          <span
            className={`text-xs px-2 py-1 rounded-full ${statusClasses[object.status] ?? "text-gray-300 border border-gray-500/30 bg-gray-500/10"}`}
          >
            {object.status}
          </span>
        </td>
        <td>
          <div className="flex flex-wrap gap-2">
            {object.profiles.length ? (
              object.profiles.map((profile) => (
                <span
                  key={`${object.metaId}-${profile.id}`}
                  className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-200 border border-gray-700"
                >
                  {profile.name}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">Sem perfis</span>
            )}
          </div>
        </td>
        <td>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleEdit(object)}
              disabled={object.tipo === "BASE"}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-700 text-gray-200 hover:border-lime-400 hover:text-lime-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => handleOpenPermissions(object)}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-700 text-gray-200 hover:border-blue-400 hover:text-blue-200"
            >
              Permissoes
            </button>
            <button
              type="button"
              onClick={() => handleDeleteRequest(object)}
              disabled={object.tipo === "BASE"}
              className="text-xs px-3 py-1.5 rounded-md border border-red-500/40 text-red-300 hover:border-red-400 hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Excluir
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Governanca de dados</p>
            <h1 className="text-3xl font-bold text-white mt-1">Catalogo de Objetos de Dados</h1>
            <p className="text-gray-400 mt-2">
              Gerencie quais objetos estao ativos, quem pode acessa-los e conecte suas criacoes do Estudio SQL ao BI.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Customizados</p>
              <strong className="text-white text-lg">{totalCustomObjects}</strong>
            </div>
            <button
              type="button"
              onClick={fetchMetaObjects}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-200 hover:border-lime-300"
              disabled={refreshing}
            >
              {refreshing ? "Sincronizando..." : "Atualizar"}
            </button>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Catalogo vivo</p>
              <h2>Objetos disponiveis no tenant</h2>
              <p className="muted">
                Base + Customizados com status, perfis de acesso e atalhos de manutencao.
              </p>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome amigavel</th>
                  <th>ID do objeto</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Perfis</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedObject && (
        <PermissionsModal
          isOpen={permissionsOpen}
          onClose={closePermissionsModal}
          onSave={handleSavePermissions}
          objectName={selectedObject.nomeAmigavel}
          currentProfileIds={selectedObject.profiles.map((profile) => profile.id)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-2">Arquivar objeto?</h3>
            <p className="text-sm text-gray-300">
              Confirme para remover <strong>{deleteTarget.nomeAmigavel}</strong>. O backend vai validar se este objeto ainda alimenta dashboards antes de concluir.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="px-4 py-2 rounded-md border border-gray-600 text-gray-200 hover:border-gray-400"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
