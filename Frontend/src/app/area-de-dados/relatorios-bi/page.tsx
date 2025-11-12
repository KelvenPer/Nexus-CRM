"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

type DashboardSummary = {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  updatedAt?: string;
  widgets?: number;
};

export default function DashboardGalleryPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateFallbackId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
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
          setDashboards(
            rawList.map((item) => ({
              id: String(item.id ?? item.dashboardId ?? generateFallbackId()),
              name: item.name ?? item.titulo ?? "Dashboard sem nome",
              description: item.description ?? item.descricao ?? "",
              owner: item.owner ?? item.responsavel,
              updatedAt: item.updatedAt ?? item.atualizadoEm,
              widgets: Array.isArray(item.widgets) ? item.widgets.length : item.totalWidgets ?? 0,
            }))
          );
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

  const handleCreateDashboard = () => {
    router.push("/area-de-dados/construtor/novo");
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-40 rounded-lg bg-gray-800/60 animate-pulse border border-gray-800"
            />
          ))}
        </div>
      );
    }

    if (errorMessage) {
      return (
        <div className="p-6 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200">
          {errorMessage}
        </div>
      );
    }

    if (!dashboards.length) {
      return (
        <div className="p-10 border border-dashed border-gray-700 rounded-xl text-center text-gray-400">
          <p>Nenhum dashboard ainda.</p>
          <p className="text-sm mt-2">
            Clique em &quot;+ Criar Novo Dashboard&quot; para iniciar seu primeiro painel.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {dashboards.map((dashboard) => (
          <Link key={dashboard.id} href={`/area-de-dados/construtor/${dashboard.id}`}>
            <div className="group block p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-lime-400 transition-colors duration-200 h-44 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {dashboard.owner ? `Owner: ${dashboard.owner}` : "Dashboard"}
                </p>
                <h2 className="text-xl font-semibold text-white line-clamp-2">
                  {dashboard.name}
                </h2>
                {dashboard.description && (
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                    {dashboard.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>{dashboard.widgets ? `${dashboard.widgets} widgets` : "Sem widgets"}</span>
                <span className="text-lime-400 group-hover:translate-x-1 transition-transform">
                  Abrir &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Relatorios e BI</p>
            <h1 className="text-3xl font-bold text-white mt-1">Meus Relatorios e Dashboards</h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Centralize suas analises em um unico lugar. Observe performance comercial, marketing
              e funil sem sair do Nexus CRM.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateDashboard}
            className="self-start md:self-auto inline-flex items-center gap-2 px-6 py-3 text-black font-semibold rounded-lg bg-lime-400 hover:bg-lime-300 transition-colors"
          >
            + Criar Novo Dashboard
          </button>
        </header>
        {renderContent()}
      </div>
    </AppShell>
  );
}
