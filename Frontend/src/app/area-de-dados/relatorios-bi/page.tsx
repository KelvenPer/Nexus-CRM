"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import AppShell from "@/components/layout/AppShell";
import { getStoredSession, getAuthHeaders } from "@/lib/auth";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

type DashboardSummary = {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  updatedAt?: string;
  widgets?: number;
  favorite?: boolean;
  thumbnailUrl?: string;
};

const FILTER_TABS = [
  { key: "todos", label: "Todos" },
  { key: "meus", label: "Meus Relatorios" },
  { key: "favoritos", label: "Favoritos" },
  { key: "compartilhados", label: "Compartilhados Comigo" },
] as const;

export default function DashboardGalleryPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_TABS)[number]["key"]>("todos");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const favoritesReady = useRef(false);

  const generateFallbackId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
    const session = getStoredSession();
    setCurrentUser(session?.userName ?? null);

    if (typeof window !== "undefined") {
      const storedFavorites = localStorage.getItem("nexus_dashboard_favorites");
      if (storedFavorites) {
        favoritesReady.current = true;
        setFavoriteIds(JSON.parse(storedFavorites));
      }
    }

    let isMounted = true;

    const fetchDashboards = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/dados/dashboards`);
        if (!response.ok) {
          throw new Error(`Falha ao carregar dashboards (${response.status})`);
        }

        const data = await response.json();
        const rawList: DashboardSummary[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.dashboards)
          ? data.dashboards
          : [];

        if (isMounted) {
          const normalized = rawList.map((item) => ({
            id: String(item.id ?? item.dashboardId ?? generateFallbackId()),
            name: item.name ?? item.titulo ?? "Dashboard sem nome",
            description: item.description ?? item.descricao ?? "",
            owner: item.ownerName ?? item.owner ?? item.responsavel ?? "Nexus Data Team",
            updatedAt: item.updatedAt ?? item.atualizadoEm ?? "há pouco",
            widgets: Array.isArray(item.widgets) ? item.widgets.length : item.totalWidgets ?? 0,
            favorite: Boolean(item.favorite),
            thumbnailUrl: item.thumbnailUrl ?? undefined,
          }));
          setDashboards(normalized);
          const apiFavorites = normalized.filter((item) => item.favorite).map((item) => item.id);
          favoritesReady.current = true;
          setFavoriteIds(apiFavorites);
          if (typeof window !== "undefined") {
            localStorage.setItem("nexus_dashboard_favorites", JSON.stringify(apiFavorites));
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorMessage("Nao foi possivel carregar seus dashboards.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboards();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (favoritesReady.current || !dashboards.length) {
      return;
    }
    const seededFavorites = dashboards.filter((dashboard) => dashboard.favorite).map((dashboard) => dashboard.id);
    if (seededFavorites.length) {
      favoritesReady.current = true;
      setFavoriteIds(seededFavorites);
    }
  }, [dashboards]);

  useEffect(() => {
    if (!favoritesReady.current || typeof window === "undefined") {
      return;
    }
    localStorage.setItem("nexus_dashboard_favorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const handleToggleFavorite = (
    event: ReactMouseEvent<HTMLButtonElement>,
    dashboardId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    favoritesReady.current = true;
    setFavoriteIds((prev) =>
      prev.includes(dashboardId) ? prev.filter((id) => id !== dashboardId) : [...prev, dashboardId]
    );
  };

  const handleCreateDashboard = () => {
    router.push("/area-de-dados/construtor/novo");
  };

  const handleToggleFavorite = useCallback(
    async (event: ReactMouseEvent<HTMLButtonElement>, dashboardId: string, currentState: boolean) => {
      event.preventDefault();
      event.stopPropagation();
      favoritesReady.current = true;
      const nextFavorite = !currentState;
      const previous = favoriteIds;
      setFavoriteIds(
        nextFavorite ? [...favoriteIds, dashboardId] : favoriteIds.filter((id) => id !== dashboardId)
      );
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/dados/dashboards/${dashboardId}/favorite`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ favorite: nextFavorite }),
          }
        );
        if (!response.ok) {
          throw new Error("Falha ao atualizar favorito");
        }
      } catch (error) {
        console.error(error);
        setFavoriteIds(previous);
      }
    },
    [favoriteIds]
  );

  const filteredDashboards = useMemo(() => {
    return dashboards.filter((dashboard) => {
      const isFavorite = favoriteIds.includes(dashboard.id);
      const isOwner = currentUser ? dashboard.owner === currentUser : false;

      if (activeFilter === "favoritos" && !isFavorite) {
        return false;
      }
      if (activeFilter === "meus" && currentUser && !isOwner) {
        return false;
      }
      if (activeFilter === "compartilhados" && currentUser && isOwner) {
        return false;
      }

      if (search.trim()) {
        return dashboard.name.toLowerCase().includes(search.toLowerCase());
      }

      return true;
    });
  }, [activeFilter, dashboards, search, currentUser, favoriteIds]);

  const renderGallery = () => {
    if (isLoading) {
      return (
        <div className="bi-gallery grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="bi-card skeleton" />
          ))}
        </div>
      );
    }

    if (errorMessage) {
      return <div className="bi-feedback error">{errorMessage}</div>;
    }

    if (!filteredDashboards.length) {
      return (
        <div className="bi-feedback empty">
          <p>Nenhum dashboard encontrado.</p>
          <p>Use os filtros ou crie um novo painel personalizado.</p>
        </div>
      );
    }

    return (
      <div className="bi-gallery grid">
        {filteredDashboards.map((dashboard) => {
          const isFavorite = favoriteIds.includes(dashboard.id);
          return (
            <Link key={dashboard.id} href={`/area-de-dados/construtor/${dashboard.id}`} className="bi-card group">
              <div className="card-thumbnail">
                {dashboard.thumbnailUrl ? (
                  <Image
                    src={dashboard.thumbnailUrl}
                    alt={dashboard.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="thumbnail-image"
                    unoptimized
                  />
                ) : (
                  <div className="thumbnail-text">Preview</div>
                )}
                <div className="card-quick-actions">
                  <button
                    type="button"
                    aria-label="Favoritar"
                    className={isFavorite ? "active" : ""}
                    onClick={(event) => handleToggleFavorite(event, dashboard.id, isFavorite)}
                  >
                    ★
                  </button>
                  <button type="button" aria-label="Menu" onClick={(event) => event.preventDefault()}>
                    ···
                  </button>
                </div>
              </div>
              <div className="card-body">
                <p className="card-owner">{dashboard.owner ?? "Nexus Data Team"}</p>
                <h2>{dashboard.name}</h2>
                {dashboard.description && <p className="card-description">{dashboard.description}</p>}
              </div>
              <div className="card-meta">
                <span>{dashboard.widgets ? `${dashboard.widgets} widgets` : "Sem widgets"}</span>
                <span>{dashboard.updatedAt}</span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="bi-page">
        <header className="bi-hero">
          <div>
            <p className="eyebrow">Relatorios e BI</p>
            <h1>Galeria de dashboards e insights</h1>
            <p>
              Descubra paineis criados pelo time de dados ou publique os seus para compartilhar indicadores com toda a organizacao.
            </p>
            <div className="hero-tags">
              <span>Dashboards</span>
              <span>KPI Boards</span>
              <span>Stories</span>
            </div>
          </div>
          <div className="hero-actions">
            <div className="search-field">
              <input
                type="text"
                placeholder="Buscar relatórios..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button type="button" className="primary-action" onClick={handleCreateDashboard}>
              + Novo Relatorio
            </button>
          </div>
        </header>

        <nav className="bi-filter-bar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeFilter === tab.key ? "active" : ""}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {renderGallery()}
      </div>
    </AppShell>
  );
}
