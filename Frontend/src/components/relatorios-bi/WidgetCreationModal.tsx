 "use client";

 import React, { useMemo, useState } from "react";
 import { MetaObject, WidgetDefinition, WidgetType } from "./types";

 type WidgetCreationModalProps = {
  isOpen: boolean;
  metaObjects: MetaObject[];
  onClose: () => void;
  onCreateWidget: (widget: WidgetDefinition) => void;
 };

const chartOptions: { value: WidgetType; title: string; hint: string }[] = [
  { value: "bar", title: "Gráfico de Barras", hint: "Comparações entre grupos" },
  { value: "line", title: "Gráfico de Linha", hint: "Tendências ao longo do tempo" },
  { value: "pie", title: "Gráfico de Pizza", hint: "Fatia de um total" },
  { value: "kpi", title: "Cartão KPI", hint: "Número resumido (total/contagem)" },
];

const aggregateOptions = ["SUM", "AVG", "COUNT"];

export default function WidgetCreationModal({
  isOpen,
  metaObjects,
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
  const [statusMessage, setStatusMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredObjects = useMemo(() => {
    if (!search.trim()) {
      return metaObjects;
    }
    return metaObjects.filter((obj) =>
      obj.nomeAmigavel.toLowerCase().includes(search.toLowerCase())
    );
  }, [metaObjects, search]);

  const resetState = () => {
    setStep(1);
    setSearch("");
    setSelectedObject(null);
    setChartType("bar");
    setGroupBy("");
    setAggregateField("");
    setAggregate("SUM");
    setStatusMessage("");
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedObject || !groupBy || !aggregateField) {
      setStatusMessage("Selecione a fonte, o eixo X e o eixo Y antes de prosseguir.");
      return;
    }

    setStatusMessage("");
    setIsProcessing(true);
    try {
      const response = await fetch("/api/v1/data/query/no-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectId: selectedObject.id,
          groupBy,
          aggregate,
          aggregateField,
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha ao gerar consulta (${response.status})`);
      }

      const data = await response.json();
      const rows: Record<string, unknown>[] =
        Array.isArray(data.rows) || Array.isArray(data.data)
          ? (data.rows ?? data.data ?? [])
          : [];

      onCreateWidget({
        id: `widget-${Date.now()}`,
        title: `${chartOptions.find((option) => option.value === chartType)?.title ?? "Widget"}`,
        chartType,
        objectId: selectedObject.id,
        objectLabel: selectedObject.nomeAmigavel,
        groupBy,
        aggregate,
        aggregateField,
        data: rows,
      });
      handleClose();
    } catch (error) {
      console.error(error);
      setStatusMessage("Não foi possível criar o widget, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="builder-modal">
        <header className="builder-modal-header">
          <div>
            <p className="eyebrow">Fluxo de Widget</p>
            <h3>Adicionar novo widget</h3>
          </div>
          <button type="button" className="ghost-button small" onClick={handleClose}>
            Fechar
          </button>
        </header>

        <div className="builder-steps">
          <span className={step === 1 ? "active" : ""}>1. Fonte de Dados</span>
          <span className={step === 2 ? "active" : ""}>2. Tipo de Visualização</span>
          <span className={step === 3 ? "active" : ""}>3. Configuração</span>
        </div>

        {step === 1 && (
          <div className="modal-section">
            <input
              placeholder="Buscar objetos amigáveis"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="object-list">
              {filteredObjects.map((object) => (
                <button
                  key={object.id}
                  type="button"
                  className={`object-item ${selectedObject?.id === object.id ? "active" : ""}`}
                  onClick={() => setSelectedObject(object)}
                >
                  <strong>{object.nomeAmigavel}</strong>
                  <span>{object.tipo === "custom" ? "Customizado" : "Base"}</span>
                </button>
              ))}
              {!filteredObjects.length && <p className="muted">Nenhum objeto encontrado.</p>}
            </div>
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
                <p className="eyebrow">Eixo X (Agrupamento)</p>
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
                <p className="eyebrow">Eixo Y (Valor)</p>
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
                  Agregação
                  <select value={aggregate} onChange={(event) => setAggregate(event.target.value)}>
                    {aggregateOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
                    objectId: selectedObject?.id ?? "—",
                    groupBy: groupBy || "—",
                    aggregate,
                    aggregateField: aggregateField || "—",
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {statusMessage && <p className="muted">{statusMessage}</p>}

        <footer className="builder-modal-footer">
          <div>
            {step > 1 && (
              <button type="button" className="ghost-button small" onClick={() => setStep((prev) => prev - 1)}>
                Voltar
              </button>
            )}
          </div>
          <div className="builder-modal-footer-actions">
            {step < 3 && (
              <button
                type="button"
                className="primary-button"
                onClick={() => setStep((prev) => prev + 1)}
                disabled={step === 1 && !selectedObject}
              >
                Próximo
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
