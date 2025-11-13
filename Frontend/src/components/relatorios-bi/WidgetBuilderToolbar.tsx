"use client";

import React from "react";

type WidgetBuilderToolbarProps = {
  dashboardName: string;
  onDashboardNameChange: (value: string) => void;
  onAddWidget: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasWidgets: boolean;
  isAddDisabled?: boolean;
};

export default function WidgetBuilderToolbar({
  dashboardName,
  onDashboardNameChange,
  onAddWidget,
  onSave,
  isSaving,
  hasWidgets,
  isAddDisabled,
}: WidgetBuilderToolbarProps) {
  return (
    <div className="builder-toolbar">
      <div className="builder-toolbar-input">
        <label htmlFor="dashboard-name">Nome do Dashboard</label>
        <input
          id="dashboard-name"
          value={dashboardName}
          onChange={(event) => onDashboardNameChange(event.target.value)}
          placeholder="Ex.: Analise de Vendas Trimestral"
        />
      </div>
      <div className="builder-toolbar-actions">
        <button
          className="ghost-button btn-cyan"
          type="button"
          onClick={onAddWidget}
          disabled={!!isAddDisabled}
        >
          Adicionar Widget
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={onSave}
          disabled={isSaving || !dashboardName.trim() || !hasWidgets}
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
