"use client";

import React, { useEffect, useMemo, useState } from "react";
import { userProfiles as fallbackProfiles } from "@/data/mockObjects";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export type UserProfile = {
  id: string;
  name: string;
};

type PermissionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profiles: UserProfile[]) => void | Promise<void>;
  objectName: string;
  currentProfileIds: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeProfiles = (payload: unknown): UserProfile[] => {
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown> | undefined)?.profiles)
    ? (payload as Record<string, unknown>).profiles
    : Array.isArray((payload as Record<string, unknown> | undefined)?.items)
    ? (payload as Record<string, unknown>).items
    : [];

  return rawList
    .map((profile) => {
      const idCandidate =
        typeof profile === "string"
          ? profile
          : isRecord(profile)
          ? profile.id ??
            profile.profileId ??
            profile.slug ??
            profile.codigo ??
            profile.code ??
            profile.name ??
            profile.nome
          : null;

      const nameCandidate =
        typeof profile === "string"
          ? profile
          : isRecord(profile)
          ? profile.name ?? profile.nome ?? profile.label ?? profile.descricao
          : null;

      return {
        id: idCandidate ? String(idCandidate) : "",
        name: nameCandidate ? String(nameCandidate) : "",
      };
    })
    .filter((profile) => profile.id && profile.name);
};

const PermissionsModal = ({
  isOpen,
  onClose,
  onSave,
  objectName,
  currentProfileIds,
}: PermissionsModalProps) => {
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleCheckboxChange = (profileId: string) => {
    setSelected((prev) =>
      prev.includes(profileId) ? prev.filter((item) => item !== profileId) : [...prev, profileId]
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchProfiles = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
        const response = await fetch(`${API_BASE_URL}/api/v1/perfis-de-usuario`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error(`Falha ao carregar perfis (${response.status})`);
        }

        const data = await response.json();
        if (!isMounted) return;

        const normalized = normalizeProfiles(data);
        setAvailableProfiles(normalized.length ? normalized : fallbackProfiles);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorMessage("Nao foi possivel carregar os perfis. Usando lista padrao.");
          setAvailableProfiles(fallbackProfiles);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelected(currentProfileIds);
    }
  }, [isOpen, currentProfileIds]);

  const selectedProfiles = useMemo(
    () => availableProfiles.filter((profile) => selected.includes(profile.id)),
    [availableProfiles, selected]
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.resolve(onSave(selectedProfiles));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center px-4">
      <div className="bg-white text-gray-900 p-6 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Governanca de acesso</p>
            <h2 className="text-xl font-semibold mt-1">Gerenciar acesso: {objectName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100"
            disabled={isSaving}
          >
            Fechar
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Escolha quais perfis podem consumir este objeto nos dashboards e widgets.
        </p>

        {errorMessage && (
          <p className="text-xs text-yellow-600 bg-yellow-100 border border-yellow-300 rounded-md px-3 py-2 mb-3">
            {errorMessage}
          </p>
        )}

        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">Carregando perfis...</div>
          ) : (
            availableProfiles.map((profile) => (
              <label
                key={profile.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <div>
                  <p className="font-medium">{profile.name}</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={selected.includes(profile.id)}
                  onChange={() => handleCheckboxChange(profile.id)}
                />
              </label>
            ))
          )}
        </div>

        <footer className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PermissionsModal;
