"use client";

import React, { useEffect, useState } from "react";
import { WidgetDefinition } from "@/components/relatorios-bi/types";

type WidgetLoaderProps = {
  targetModule: string;
  title?: string;
  description?: string;
};

const WidgetLoader: React.FC<WidgetLoaderProps> = ({
  targetModule,
  title = "Painel customizado",
  description = "Widgets publicados a partir da Area de Dados.",
}) => {
  const [widgets, setWidgets] = useState<WidgetDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "")
      : "";

  useEffect(() => {
    let isMounted = true;
    const fetchWidgets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
        const response = await fetch(
          `${apiBaseUrl}/api/v1/dados/widgets/target/${encodeURIComponent(targetModule)}`,
          { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );
        if (!response.ok) {
          throw new Error(`Erro ao carregar widgets (${response.status})`);
        }
        const data = await response.json();
        if (!isMounted) return;
        const list = Array.isArray(data.widgets) ? data.widgets : [];
        setWidgets(list);
      } catch (fetchError) {
        console.error(fetchError);
        if (isMounted) setError("Nao foi possivel carregar os widgets publicados.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchWidgets();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, targetModule]);

  const renderWidgetBody = (widget: WidgetDefinition) => {
    if (widget.chartType === "kpi") {
      const value = widget.data?.[0]?.[widget.aggregateField] ?? "--";
      return <p className="text-3xl font-semibold">{value}</p>;
    }

    const rows = Array.isArray(widget.data) ? widget.data.slice(0, 4) : [];
    if (!rows.length) {
      return <p className="text-sm text-gray-400">Sem dados publicados.</p>;
    }

    return (
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={`${widget.id}-${index}`} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{String(row[widget.groupBy] ?? `Item ${index + 1}`)}</span>
            <strong className="text-white">{String(row[widget.aggregateField] ?? 0)}</strong>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Insights publicados</p>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-gray-400">Carregando widgets...</div>
      ) : error ? (
        <div className="p-6 text-center text-red-300">{error}</div>
      ) : widgets.length === 0 ? (
        <div className="p-6 text-center text-gray-400">
          Nenhum widget publicado para este modulo ainda.
        </div>
      ) : (
        <div className="dashboard-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {widgets.map((widget) => (
            <article key={widget.id} className="panel" style={{ padding: 16 }}>
              <header className="panel-header" style={{ alignItems: "center" }}>
                <div>
                  <p className="eyebrow">{widget.objectLabel}</p>
                  <h4>{widget.title}</h4>
                </div>
                <span className="badge">{widget.chartType.toUpperCase()}</span>
              </header>
              {renderWidgetBody(widget)}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default WidgetLoader;
