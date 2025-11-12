"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import SchemaBrowser from "@/components/sql-studio/SchemaBrowser";
import SqlEditor from "@/components/sql-studio/SqlEditor";
import ResultsPanel from "@/components/sql-studio/ResultsPanel";
import MetadadosPanel, {
  MetadadosPayload,
  MetadadosPanelHandle,
} from "@/components/sql-studio/MetadadosPanel";

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

const queryLines = [
  "SELECT t1.id, t1.nome, t2.valor",
  "  FROM tb_omniato t1",
  "  JOIN tb_oportunidade t2 ON t2.ont_id = t1.id",
  " WHERE t2.status IN ('Aberta', 'Proposta')",
  "   AND t2.tenant_id = current_setting('app.current_tenant')::uuid",
  " ORDER BY t2.ultima_interacao DESC",
];

const initialQuery = queryLines.join("\n");

export default function EstudioSQLPage() {
  const [sqlQuery, setSqlQuery] = useState(initialQuery);
  const [queryResult, setQueryResult] = useState<Record<string, unknown>[]>([]);
  const [executionTime, setExecutionTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isQueryValid, setIsQueryValid] = useState(true);
  const [isTestSuccessful, setIsTestSuccessful] = useState(false);
  const [refreshSchemas, setRefreshSchemas] = useState(0);
  const [resultsTab, setResultsTab] = useState<"results" | "logs">("results");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const metadataRef = useRef<MetadadosPanelHandle>(null);

  const handleInsertReference = useCallback((identifier: string) => {
    setSqlQuery((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) {
        return `${identifier} `;
      }
      return `${trimmed} ${identifier} `;
    });
  }, []);

  const handleValidationChange = useCallback((valid: boolean) => {
    setIsQueryValid(valid);
    if (!valid) {
      setIsTestSuccessful(false);
    }
  }, []);

  useEffect(() => {
    setIsTestSuccessful(false);
  }, [sqlQuery]);

  const handleTestQuery = useCallback(async () => {
    if (!isQueryValid) {
      return;
    }

    setIsLoading(true);
    setIsTestSuccessful(false);
    setStatusMessage(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/query/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: sqlQuery }),
      });

      if (!response.ok) {
        throw new Error(`Teste falhou (${response.status})`);
      }

      const data = await response.json();
      setQueryResult(Array.isArray(data.results) ? data.results : []);
      setExecutionTime(data.time ?? "");
      setIsTestSuccessful(true);
      setResultsTab("results");
      setStatusMessage("Consulta executada com sucesso.");
    } catch (error) {
      console.error(error);
      setQueryResult([]);
      setExecutionTime("");
      setResultsTab("logs");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel executar a consulta. Verifique os logs."
      );
    } finally {
      setIsLoading(false);
    }
  }, [isQueryValid, sqlQuery]);

  const handleClear = useCallback(() => {
    setSqlQuery("");
    setQueryResult([]);
    setExecutionTime("");
    setIsTestSuccessful(false);
    setStatusMessage(null);
  }, []);

  const handleSaveObject = useCallback(async (payload: MetadadosPayload) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
      const response = await fetch(`${API_BASE_URL}/api/v1/dados/meta-objetos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Falha ao salvar (${response.status})`);
      }

      alert("Objeto salvo com sucesso!");
      setRefreshSchemas((previous) => previous + 1);
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel salvar o objeto.");
    }
  }, []);

  return (
    <AppShell>
      <div className="sql-studio-page">
        <header className="sql-studio-hero">
          <div>
            <p className="eyebrow">Estudio SQL</p>
            <h1>Construa visores seguros e publique para toda a plataforma</h1>
            <p className="muted">
              Explore tabelas, escreva consultas validadas e compartilhe resultados com Vendas, Marketing e BI.
            </p>
          </div>
          <div className="hero-stats">
            <div>
              <strong>{refreshSchemas}</strong>
              <span>Atualizacoes de schema</span>
            </div>
            <div>
              <strong>{queryResult.length}</strong>
              <span>Linhas retornadas</span>
            </div>
          </div>
        </header>

        <div className="sql-workspace">
          <aside className="sql-schema-panel glass-panel">
            <div className="panel-header">
              <div>
                <p className="panel-title">Schema Explorer</p>
                <span className="panel-subtitle">Clique para inserir referencias no editor.</span>
              </div>
              <button
                type="button"
                className="ghost-button small"
                onClick={() => setRefreshSchemas((prev) => prev + 1)}
              >
                Atualizar
              </button>
            </div>
            <div className="schema-browser-wrapper">
              <SchemaBrowser onInsertReference={handleInsertReference} refreshKey={refreshSchemas} />
            </div>
          </aside>

          <div className="sql-panel-column">
            <section className="sql-editor-card glass-panel">
              <div className="sql-editor-tabs">
                <button className="active">Query 1</button>
                <button type="button" disabled>
                  +
                </button>
              </div>
              <div className="sql-editor-wrapper">
                <SqlEditor
                  sqlQuery={sqlQuery}
                  setSqlQuery={setSqlQuery}
                  onValidationChange={handleValidationChange}
                  executionTime={executionTime}
                />
              </div>
              <div className="sql-editor-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={handleTestQuery}
                  disabled={!isQueryValid || isLoading}
                >
                  {isLoading ? <span className="spinner" /> : "▶ Executar (Ctrl + Enter)"}
                </button>
                <button type="button" className="ghost-button" onClick={handleClear}>
                  Limpar
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={!isTestSuccessful}
                  onClick={() => metadataRef.current?.submit()}
                >
                  Publicar objeto
                </button>
                <span className="execution-time">
                  {executionTime ? `Tempo: ${executionTime}` : "Aguardando execucao"}
                </span>
              </div>
            </section>

            <section className="sql-results-card glass-panel">
              <div className="results-header">
                <div className="results-tabs">
                  <button
                    type="button"
                    className={resultsTab === "results" ? "active" : ""}
                    onClick={() => setResultsTab("results")}
                  >
                    Resultados
                  </button>
                  <button
                    type="button"
                    className={resultsTab === "logs" ? "active" : ""}
                    onClick={() => setResultsTab("logs")}
                  >
                    Logs
                  </button>
                </div>
                {statusMessage && <p className="logs-hint">{statusMessage}</p>}
              </div>
              <div className="results-content">
                {resultsTab === "results" ? (
                  <ResultsPanel queryResult={queryResult} isLoading={isLoading} executionTime={executionTime} />
                ) : (
                  <div className="logs-panel">
                    <p>Todos os avisos e erros da execucao aparecem aqui.</p>
                    {!isQueryValid && (
                      <p className="log-warning">
                        Comandos nao permitidos detectados. Ajuste a consulta e tente novamente.
                      </p>
                    )}
                    {isLoading && <p className="log-info">Executando consulta...</p>}
                    {!isLoading && isTestSuccessful && (
                      <p className="log-success">Ultima execucao concluida com sucesso.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="metadata-card">
                <div className="panel-header compact">
                  <div>
                    <p className="panel-title">Meta-objeto</p>
                    <span className="panel-subtitle">
                      Defina nome, ID tecnico e perfis para publicar este dataset.
                    </span>
                  </div>
                </div>
                <MetadadosPanel
                  ref={metadataRef}
                  sqlQuery={sqlQuery}
                  isTestSuccessful={isTestSuccessful}
                  onSaveClick={handleSaveObject}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
