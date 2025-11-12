 "use client";

 import { useCallback, useEffect, useMemo, useState } from "react";
 import { useParams } from "next/navigation";
 import AppShell from "@/components/layout/AppShell";
 import DashboardCanvas from "@/components/relatorios-bi/DashboardCanvas";
 import WidgetBuilderToolbar from "@/components/relatorios-bi/WidgetBuilderToolbar";
 import WidgetCreationModal from "@/components/relatorios-bi/WidgetCreationModal";
 import { MetaObject, WidgetDefinition } from "@/components/relatorios-bi/types";
 import type { Layout } from "react-grid-layout";
 import "react-grid-layout/css/styles.css";
 import "react-resizable/css/styles.css";

const sampleWidgets: WidgetDefinition[] = [
  {
    id: "widget-vendas",
    title: "Gráfico de Barras",
    objectId: 9001,
    objectLabel: "Vendas por Campanha (Customizado)",
    chartType: "bar",
    groupBy: "CAMPANHA_NOME",
    aggregate: "SUM",
    aggregateField: "VALOR_ESTIMADO",
    data: [
      { CAMPANHA_NOME: "Campanha A", VALOR_ESTIMADO: 78000 },
      { CAMPANHA_NOME: "Campanha B", VALOR_ESTIMADO: 54000 },
    ],
  },
];

const sampleMetaObjects: MetaObject[] = [
  {
    id: 9001,
    nomeAmigavel: "Vendas por Campanha (Customizado)",
    tipo: "custom",
    fields: ["CAMPANHA_NOME", "VALOR_ESTIMADO", "DATA_LANCAMENTO"],
  },
  {
    id: 8002,
    nomeAmigavel: "Oportunidades (Base)",
    tipo: "base",
    fields: ["OPORTUNIDADE_ID", "ETAPA", "VALOR_ESTIMADO"],
  },
];

export default function DashboardBuilderPage() {
  const params = useParams();
  const dashboardId = params.dashboardId ?? "novo";

  const [dashboardName, setDashboardName] = useState("");
  const [widgets, setWidgets] = useState<WidgetDefinition[]>([]);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [metaObjects, setMetaObjects] = useState<MetaObject[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadMetaObjects() {
      try {
        const response = await fetch("/api/v1/meta-objetos");
        if (!response.ok) {
          throw new Error("Falha ao buscar objetos");
        }
        const data = await response.json();
        if (!isMounted) return;
        setMetaObjects(Array.isArray(data) ? data : data.objects ?? sampleMetaObjects);
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setMetaObjects(sampleMetaObjects);
        }
      } finally {
        if (isMounted) {
          setMetaLoading(false);
        }
      }
    }
    loadMetaObjects();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (!dashboardId || dashboardId === "novo") {
        setWidgets(sampleWidgets);
        setLayout([
          { i: sampleWidgets[0].id, x: 0, y: 0, w: 6, h: 4 },
        ]);
        return;
      }
      try {
        const response = await fetch(`/api/v1/dashboards/${dashboardId}`);
        if (!response.ok) {
          throw new Error("Não foi possível carregar o dashboard");
        }
        const data = await response.json();
        if (!isMounted) return;
        setDashboardName(data.name ?? "");
        setWidgets(data.widgets ?? []);
        setLayout(
          (data.widgets ?? []).map((widget: WidgetDefinition, index: number) => ({
            i: widget.id,
            x: (index * 2) % 12,
            y: Infinity,
            w: 6,
            h: 4,
          }))
        );
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setWidgets(sampleWidgets);
          setLayout([{ i: sampleWidgets[0].id, x: 0, y: 0, w: 6, h: 4 }]);
        }
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [dashboardId]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleCreateWidget = useCallback((widget: WidgetDefinition) => {
    setWidgets((current) => [...current, widget]);
    setLayout((current) => [
      ...current,
      {
        i: widget.id,
        x: (current.length * 2) % 12,
        y: Infinity,
        w: 6,
        h: 4,
      },
    ]);
  }, []);

  const handleLayoutChange = useCallback((nextLayout: Layout[]) => {
    setLayout(nextLayout);
  }, []);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((current) => current.filter((widget) => widget.id !== widgetId));
    setLayout((current) => current.filter((item) => item.i !== widgetId));
  }, []);

  const handleSaveDashboard = useCallback(async () => {
    if (!dashboardName.trim() || !widgets.length) {
      setStatusMessage("Defina um nome e adicione pelo menos um widget antes de salvar.");
      return;
    }
    setIsSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/v1/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dashboardId !== "novo" ? dashboardId : undefined,
          name: dashboardName.trim(),
          widgets,
        }),
      });
      if (!response.ok) {
        throw new Error("Falha ao salvar o dashboard");
      }
      setStatusMessage("Dashboard salvo com sucesso.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Não foi possível salvar o dashboard.");
    } finally {
      setIsSaving(false);
    }
  }, [dashboardId, dashboardName, widgets]);

  const metaSource = useMemo(() => metaObjects, [metaObjects]);

  return (
    <AppShell>
      <div className="builder-shell">
        <WidgetBuilderToolbar
          dashboardName={dashboardName}
          onDashboardNameChange={setDashboardName}
          onAddWidget={handleOpenModal}
          onSave={handleSaveDashboard}
          isSaving={isSaving}
          hasWidgets={widgets.length > 0}
        />
        <DashboardCanvas
          widgets={widgets}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={handleRemoveWidget}
        />
        {statusMessage && <p className="muted builder-status">{statusMessage}</p>}
      </div>
      <WidgetCreationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        metaObjects={metaLoading ? sampleMetaObjects : metaSource}
        onCreateWidget={handleCreateWidget}
      />
    </AppShell>
  );
}
