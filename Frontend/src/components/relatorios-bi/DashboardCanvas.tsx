"use client";

import React, { useMemo } from "react";
import { Layout, Responsive, WidthProvider } from "react-grid-layout";
import { WidgetDefinition } from "./types";

const ResponsiveGridLayout = WidthProvider(Responsive);

type DashboardCanvasProps = {
  widgets: WidgetDefinition[];
  layout: Layout[];
  onLayoutChange: (layout: Layout[]) => void;
  onRemoveWidget: (widgetId: string) => void;
};

export default function DashboardCanvas({
  widgets,
  layout,
  onLayoutChange,
  onRemoveWidget,
}: DashboardCanvasProps) {
  const synchronizedLayout = useMemo(() => {
    const base: Layout[] = widgets.map((widget, index) => {
      const existing = layout.find((item) => item.i === widget.id);
      if (existing) return existing;
      return {
        i: widget.id,
        x: (index * 2) % 12,
        y: Infinity,
        w: 6,
        h: widget.chartType === "kpi" ? 3 : 4,
      };
    });

    return base;
  }, [layout, widgets]);

  const layoutMap = useMemo(
    () =>
      synchronizedLayout.reduce<Record<string, Layout>>((acc, current) => {
        acc[current.i] = current;
        return acc;
      }, {}),
    [synchronizedLayout]
  );

  if (!widgets.length) {
    return (
      <section className="canvas-panel">
        <header>
          <h3>Canvas do Dashboard</h3>
          <p className="muted">Comece adicionando widgets para preencher o painel.</p>
        </header>
        <div className="canvas-empty">Nenhum widget ainda.</div>
      </section>
    );
  }

  return (
    <section className="canvas-panel">
      <header>
        <h3>Canvas do Dashboard</h3>
        <p className="muted">Arraste e redimensione cada visualizacao como preferir.</p>
      </header>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: synchronizedLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={120}
        isResizable
        isDraggable
        margin={[16, 16]}
        onLayoutChange={(currentLayout) => onLayoutChange(currentLayout)}
      >
        {widgets.map((widget) => (
          <article key={widget.id} data-grid={layoutMap[widget.id]}>
            <header className="widget-header widget-handle">
              <div>
                <strong>{widget.title}</strong>
                <span className="muted">{widget.objectLabel}</span>
              </div>
              <button
                type="button"
                aria-label="Remover widget"
                className="ghost-button small"
                onClick={() => onRemoveWidget(widget.id)}
              >
                Remover
              </button>
            </header>
            <div className="widget-body">
              <p className="widget-type">{widget.chartType.toUpperCase()}</p>
              <div className="widget-preview">
                {widget.data.slice(0, 4).map((row, index) => (
                  <div key={`${widget.id}-${index}`} className="widget-preview-row">
                    <strong>{row[widget.groupBy] as string}</strong>
                    <span>{String(row[widget.aggregateField] ?? "")}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </ResponsiveGridLayout>
    </section>
  );
}
