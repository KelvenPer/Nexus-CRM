"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "react-grid-layout";
import AppShell from "@/components/layout/AppShell";
import WidgetBuilderToolbar from "@/components/relatorios-bi/WidgetBuilderToolbar";
import DashboardCanvas from "@/components/relatorios-bi/DashboardCanvas";
import WidgetCreationModal from "@/components/relatorios-bi/WidgetCreationModal";
import { MetaObject, WidgetDefinition, WidgetType } from "@/components/relatorios-bi/types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

type DashboardApiResponse = {
  id?: string | number;
  name?: string;
  titulo?: string;
  widgets?: unknown[];
  layout?: Layout[];
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const toStringOrFallback = (value: unknown, fallback = ""): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return fallback;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const toRecordArray = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const normalizeWidget = (widgetInput: unknown, fallbackIndex: number): WidgetDefinition => {
  const widget = isRecord(widgetInput) ? widgetInput : {};

  const chartTypeRaw = (widget.chartType ?? widget.tipo ?? "bar") as string;
  const allowedTypes: WidgetType[] = ["bar", "line", "pie", "kpi"];
  const chartType = allowedTypes.includes(chartTypeRaw as WidgetType)
    ? (chartTypeRaw as WidgetType)
    : "bar";

  const objectIdCandidate =
    widget.objectId ??
    widget.metaObjectId ??
    (isRecord(widget.object) ? widget.object.metaId ?? widget.object.id : undefined) ??
    widget.idObjeto ??
    fallbackIndex;

  return {
    id: toStringOrFallback(widget.id ?? widget.widgetId ?? `widget-${fallbackIndex}`),
    title: toStringOrFallback(widget.title ?? widget.nome, "Widget sem titulo"),
    chartType,
    objectId: toStringOrFallback(objectIdCandidate, String(fallbackIndex)),
    objectLabel: toStringOrFallback(
      widget.objectLabel ??
        widget.objectName ??
        (isRecord(widget.object) ? widget.object.nomeAmigavel : undefined),
      "Objeto"
    ),
    groupBy: toStringOrFallback(widget.groupBy ?? widget.eixoX),
    aggregate: toStringOrFallback(widget.aggregate ?? widget.agregacao, "SUM"),
    aggregateField: toStringOrFallback(widget.aggregateField ?? widget.eixoY),
    data: toRecordArray(Array.isArray(widget.data) ? widget.data : widget.rows),
    publishTargets: toStringArray(widget.publishTargets),
  };
};

const normalizeLayout = (layoutInput: unknown, widgets: WidgetDefinition[]): Layout[] => {
  if (Array.isArray(layoutInput) && layoutInput.length) {
    return layoutInput
      .map((item, index) => {
        const record = isRecord(item) ? item : {};
        return {
          i: toStringOrFallback(record.i ?? widgets[index]?.id ?? `widget-${index}`),
          x: typeof record.x === "number" ? record.x : ((index * 4) % 12),
          y: typeof record.y === "number" ? record.y : Math.floor(index / 3) * 3,
          w: typeof record.w === "number" ? record.w : 4,
          h: typeof record.h === "number" ? record.h : 4,
        };
      })
      .filter((item) => widgets.some((widget) => widget.id === item.i));
  }

  return widgets.map((widget, index) => ({
    i: widget.id,
    x: (index * 4) % 12,
    y: Math.floor(index / 3) * 3,
    w: widget.chartType === "kpi" ? 4 : 6,
    h: widget.chartType === "kpi" ? 3 : 4,
  }));
};

const normalizeMetaObjects = (payload: unknown): MetaObject[] => {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as UnknownRecord | undefined)?.metaObjects)
    ? (payload as UnknownRecord).metaObjects
    : Array.isArray((payload as UnknownRecord | undefined)?.objetos)
    ? (payload as UnknownRecord).objetos
    : [];

  return list
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const fields =
        toStringArray(item.fields) ||
        (Array.isArray(item.columns)
          ? item.columns
              .map((column) => (isRecord(column) ? column.name ?? column.nome ?? column.label : null))
              .filter((value): value is string => typeof value === "string")
          : []);

      const metaId = toStringOrFallback(item.metaId ?? item.id ?? item.objectId);
      if (!metaId) {
        return null;
      }

      const rawTipo = toStringOrFallback(item.tipo ?? item.kind, "custom").toUpperCase();
      return {
        metaId,
        idObjeto: toStringOrFallback(item.idObjeto ?? item.slug ?? item.apiName ?? metaId, metaId),
        nomeAmigavel: toStringOrFallback(item.nomeAmigavel ?? item.name, "Objeto sem nome"),
        tipo: rawTipo === "BASE" ? "BASE" : "CUSTOMIZADO",
        fields,
      };
    })
    .filter((item): item is MetaObject => Boolean(item));
};

export default function DashboardBuilderPage({ params }: { params: { dashboardId: string } }) {
  const isNewDashboard = params.dashboardId === "novo";

  const [dashboardName, setDashboardName] = useState(isNewDashboard ? "Novo Dashboard" : "");
  const [widgets, setWidgets] = useState<WidgetDefinition[]>([]);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [metaObjects, setMetaObjects] = useState<MetaObject[]>([]);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [isDashboardLoading, setIsDashboardLoading] = useState(!isNewDashboard);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetaObjects = async () => {
      setIsMetaLoading(true);
      setMetaError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/dados/meta-objetos/disponiveis`);
        if (!response.ok) {
          throw new Error(`Erro ao carregar objetos (${response.status})`);
        }
        const data = await response.json();
        if (isMounted) {
          setMetaObjects(normalizeMetaObjects(data));
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setMetaError("Nao foi possivel carregar os objetos do Estudio SQL.");
        }
      } finally {
        if (isMounted) {
          setIsMetaLoading(false);
        }
      }
    };

    fetchMetaObjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isNewDashboard) {
      setIsDashboardLoading(false);
      return;
    }

    let isMounted = true;

    const fetchDashboard = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/dados/dashboards/${params.dashboardId}`);
        if (!response.ok) {
          throw new Error(`Erro ao carregar dashboard (${response.status})`);
        }

        const data: DashboardApiResponse = await response.json();
        const normalizedWidgets: WidgetDefinition[] = Array.isArray(data?.widgets)
          ? data!.widgets!.map((widget, index) => normalizeWidget(widget, index))
          : [];

        if (isMounted) {
          setDashboardName(data?.name ?? data?.titulo ?? "Dashboard sem nome");
          setWidgets(normalizedWidgets);
          setLayout(normalizeLayout(data?.layout, normalizedWidgets));
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setDashboardError("Nao foi possivel carregar este dashboard.");
        }
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, [isNewDashboard, params.dashboardId]);

  const handleCreateWidget = useCallback(
    (newWidget: WidgetDefinition) => {
      setWidgets((prev) => [...prev, newWidget]);
      setLayout((previous) => [
        ...previous,
        {
          i: newWidget.id,
          x: 0,
          y: Infinity,
          w: newWidget.chartType === "kpi" ? 4 : 6,
          h: newWidget.chartType === "kpi" ? 3 : 4,
        },
      ]);
      setIsModalOpen(false);
    },
    []
  );

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
    setLayout((prev) => prev.filter((item) => item.i !== widgetId));
  }, []);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const payload = {
        id: isNewDashboard ? undefined : params.dashboardId,
        name: dashboardName,
        widgets,
        layout,
      };

      const endpoint = isNewDashboard
        ? `${API_BASE_URL}/api/v1/dados/dashboards`
        : `${API_BASE_URL}/api/v1/dados/dashboards/${params.dashboardId}`;

      const response = await fetch(endpoint, {
        method: isNewDashboard ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Falha ao salvar (${response.status})`);
      }

      alert("Dashboard salvo com sucesso!");
    } catch (error) {
      console.error(error);
      setSaveError("Nao foi possivel salvar o dashboard. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [dashboardName, isNewDashboard, layout, params.dashboardId, widgets]);

  const canAddWidget = useMemo(() => !isMetaLoading && !!metaObjects.length, [isMetaLoading, metaObjects]);

  return (
    <AppShell>
      <div className="space-y-6 p-4 md:p-8">
        <WidgetBuilderToolbar
          dashboardName={dashboardName}
          onDashboardNameChange={setDashboardName}
          onAddWidget={() => setIsModalOpen(true)}
          onSave={handleSave}
          isSaving={isSaving}
          hasWidgets={widgets.length > 0}
          isAddDisabled={!canAddWidget}
        />

        {saveError && (
          <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
            {saveError}
          </div>
        )}

        {dashboardError && (
          <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
            {dashboardError}
          </div>
        )}

        {isDashboardLoading ? (
          <div className="border border-gray-800 rounded-xl p-10 text-center text-gray-400">
            Carregando dashboard...
          </div>
        ) : (
          <DashboardCanvas
            widgets={widgets}
            layout={layout}
            onLayoutChange={handleLayoutChange}
            onRemoveWidget={handleRemoveWidget}
          />
        )}
      </div>

      {isModalOpen && (
        <WidgetCreationModal
          isOpen={isModalOpen}
          metaObjects={metaObjects}
          metaError={metaError}
          isMetaLoading={isMetaLoading}
          onClose={() => setIsModalOpen(false)}
          onCreateWidget={handleCreateWidget}
        />
      )}
    </AppShell>
  );
}
