"use client";

import React, { useMemo, useState } from "react";
import { MetaObject, WidgetDefinition, WidgetType } from "./types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

type WidgetCreationModalProps = {
  isOpen: boolean;
  metaObjects: MetaObject[];
  metaError?: string | null;
  isMetaLoading?: boolean;
  onClose: () => void;
  onCreateWidget: (widget: WidgetDefinition) => void;
};

const chartOptions: { value: WidgetType; title: string; hint: string }[] = [
  { value: "bar", title: "Grafico de Barras", hint: "Comparacoes entre grupos" },
  { value: "line", title: "Grafico de Linha", hint: "Tendencias ao longo do tempo" },
  { value: "pie", title: "Grafico de Pizza", hint: "Participacao de cada categoria" },
  { value: "kpi", title: "Cartao KPI", hint: "Numero resumido (total ou media)" },
];

const aggregateOptions = [
  { value: "SUM", label: "Soma" },
  { value: "AVG", label: "Media" },
  { value: "COUNT", label: "Contagem" },
];

const publishTargetsOptions = [
  { value: "DASHBOARD_INICIO", label: "Dashboard (Inicio / Geral)" },
  { value: "MOD_VENDAS", label: "Painel do modulo de Vendas" },
  { value: "MOD_MARKETING", label: "Painel do modulo de Marketing" },
  { value: "MOD_TRADE", label: "Painel do modulo de Trade Marketing" },
];

export default function WidgetCreationModal({
  isOpen,
  metaObjects,
  metaError,
  isMetaLoading,
  onClose,
  onCreateWidget,
}: WidgetCreationModalProps) {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedObject, setSelectedObject] = useState<MetaObject | null>(null);
  const [chartType, setChartType] = useState<WidgetType>("bar");
  const [groupBy, setGroupBy] = useState("");
  const [aggregateField, setAggregateField] = useState("");
  const [aggregate, setAggregate] = useState("SUM");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [publishTargets, setPublishTargets] = useState<string[]>(["DASHBOARD_INICIO", "MOD_VENDAS"]);

  const filteredObjects = useMemo(() => {
    const lower = search.trim().toLowerCase();
    if (!lower) {
      return metaObjects;
    }
    return metaObjects.filter((object) => object.nomeAmigavel.toLowerCase().includes(lower));
  }, [metaObjects, search]);

  const resetState = () => {
    setStep(1);
    setSearch("");
    setSelectedObject(null);
    setChartType("bar");
    setGroupBy("");
    setAggregateField("");
    setAggregate("SUM");
    setStatusMessage(null);
    setIsProcessing(false);
    setPublishTargets(["DASHBOARD_INICIO", "MOD_VENDAS"]);
  };

  const handleClose = () => {
    if (isProcessing) return;
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedObject || !groupBy || !aggregateField) {
      setStatusMessage("Escolha fonte, eixo X e eixo Y para continuar.");
      return;
    }

    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/query/no-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          objectId: selectedObject.metaId,
          groupBy,
          aggregate,
          aggregateField,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao gerar consulta (${response.status})`);
      }

      const data = await response.json();
      const rows = Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.data)
        ? data.data
        : [];

      onCreateWidget({
        id: `widget-${Date.now()}`,
        title: chartOptions.find((option) => option.value === chartType)?.title ?? "Widget",
        chartType,
        objectId: selectedObject.metaId,
        objectLabel: selectedObject.nomeAmigavel,
        groupBy,
        aggregate,
        aggregateField,
        data: rows,
        publishTargets,
      });
      handleClose();
    } catch (error) {
      console.error(error);
      setStatusMessage("Nao foi possivel criar o widget. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="builder-modal">
        <header className="builder-modal-header">
          <div>
            <p className="eyebrow">Fluxo de widget</p>
            <h3>Adicionar novo widget</h3>
          </div>
          <button type="button" className="ghost-button small" onClick={handleClose} disabled={isProcessing}>
            Fechar
          </button>
        </header>

        <div className="modal-progress">
          {[1, 2, 3].map((stepNumber) => (
            <div
              key={`step-${stepNumber}`}
              className={`modal-progress-step ${step >= stepNumber ? "active" : ""}`}
            >
              <span>{stepNumber}</span>
              <p>
                {stepNumber === 1 && "Fonte de dados"}
                {stepNumber === 2 && "Tipo de visual"}
                {stepNumber === 3 && "Configuracao"}
              </p>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="modal-section space-y-4">
            <label className="text-sm text-gray-400" htmlFor="search-objects">
              Escolha a fonte de dados
            </label>
            <input
              id="search-objects"
              className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-white"
              placeholder="Busque pelo nome amigavel"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={isMetaLoading}
            />
            {isMetaLoading ? (
              <div className="h-40 flex items-center justify-center text-gray-400">Carregando objetos...</div>
            ) : metaError ? (
              <div className="p-4 border border-red-500/40 bg-red-500/10 text-red-200 rounded-md text-sm">
                {metaError}
              </div>
            ) : filteredObjects.length ? (
              <div className="object-list">
                {filteredObjects.map((object) => (
                  <button
                    key={object.metaId}
                    type="button"
                    className={`object-card ${selectedObject?.metaId === object.metaId ? "active" : ""}`}
                    onClick={() => {
                      setSelectedObject(object);
                      setGroupBy("");
                      setAggregateField("");
                    }}
                  >
                    <strong>{object.nomeAmigavel}</strong>
                    <span>
                      {(object.tipo ?? "").toString().toUpperCase() === "BASE" ? "Base" : "Customizado"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nenhum objeto encontrado.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="modal-section">
            <div className="chart-grid">
              {chartOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chart-option ${chartType === option.value ? "active" : ""}`}
                  onClick={() => setChartType(option.value)}
                >
                  <strong>{option.title}</strong>
                  <p>{option.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="modal-section modal-section-config">
            <div className="config-columns">
              <div>
                <p className="eyebrow">Eixo X (agrupamento)</p>
                <div className="field-zone">
                  {(selectedObject?.fields ?? []).map((field) => (
                    <button
                      key={`${field}-x`}
                      type="button"
                      className={`field-chip ${groupBy === field ? "active" : ""}`}
                      onClick={() => setGroupBy(field)}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow">Eixo Y (valor)</p>
                <div className="field-zone">
                  {(selectedObject?.fields ?? []).map((field) => (
                    <button
                      key={`${field}-y`}
                      type="button"
                      className={`field-chip ${aggregateField === field ? "active" : ""}`}
                      onClick={() => setAggregateField(field)}
                    >
                      {field}
                    </button>
                  ))}
                </div>
                <label className="eyebrow">
                  Agregacao
                  <select
                    value={aggregate}
                    onChange={(event) => setAggregate(event.target.value)}
                    className="mt-2 w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2"
                  >
                    {aggregateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="preview-area">
              <p className="eyebrow">Preview do payload</p>
              <pre>
                {JSON.stringify(
                  {
                    objectId: selectedObject?.metaId ?? "--",
                    groupBy: groupBy || "--",
                    aggregate,
                    aggregateField: aggregateField || "--",
                    publishTargets,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div>
              <p className="eyebrow">Publicar este widget em</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {publishTargetsOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`field-chip ${publishTargets.includes(option.value) ? "active" : ""}`}
                    onClick={() => togglePublishTarget(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {statusMessage && <p className="text-sm text-yellow-400">{statusMessage}</p>}

        <footer className="builder-modal-footer">
          <div>
            {step > 1 && (
              <button
                type="button"
                className="ghost-button small"
                onClick={() => setStep((current) => current - 1)}
                disabled={isProcessing}
              >
                Voltar
              </button>
            )}
          </div>
          <div className="builder-modal-footer-actions">
            {step < 3 && (
              <button
                type="button"
                className="primary-button"
                onClick={() => setStep((current) => current + 1)}
                disabled={(step === 1 && !selectedObject) || isProcessing}
              >
                Proximo
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                className="primary-button btn-cyan"
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? "Gerando..." : "Confirmar widget"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
  const togglePublishTarget = (target: string) => {
    setPublishTargets((current) =>
      current.includes(target) ? current.filter((item) => item !== target) : [...current, target]
    );
  };
