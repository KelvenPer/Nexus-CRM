"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";

interface SqlEditorProps {
  sqlQuery: string;
  setSqlQuery: (query: string) => void;
  onValidationChange: (valid: boolean) => void;
  executionTime?: string;
}

const FORBIDDEN_COMMANDS = /\b(DROP|UPDATE|DELETE)\b/i;

const SqlEditor: React.FC<SqlEditorProps> = ({
  sqlQuery,
  setSqlQuery,
  onValidationChange,
  executionTime,
}) => {
  const validation = useMemo(() => {
    const trimmed = sqlQuery.trim();
    if (!trimmed) {
      return { status: "none" as const, message: "", isValid: false };
    }

    if (FORBIDDEN_COMMANDS.test(sqlQuery)) {
      return {
        status: "error" as const,
        message: "Comandos proibidos detectados (DROP, UPDATE, DELETE)!",
        isValid: false,
      };
    }

    return {
      status: "valid" as const,
      message: "Consulta validada localmente.",
      isValid: true,
    };
  }, [sqlQuery]);

  useEffect(() => {
    onValidationChange(validation.isValid);
  }, [validation.isValid, onValidationChange]);

  const handleEditorChange = useCallback(
    (value?: string) => {
      setSqlQuery(value ?? "");
    },
    [setSqlQuery]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const identifier = event.dataTransfer.getData("text/plain");
      if (!identifier) {
        return;
      }

      const trimmed = sqlQuery.trimEnd();
      const nextQuery = trimmed ? `${trimmed} ${identifier} ` : `${identifier} `;
      setSqlQuery(nextQuery);
    },
    [setSqlQuery, sqlQuery]
  );

  return (
    <div
      className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Editor</p>
          <h3 className="text-sm font-semibold text-white">Consulta SQL</h3>
        </div>
        {executionTime && (
          <p className="text-xs text-gray-500">
            Ultimo teste: <span className="text-lime-300">{executionTime}</span>
          </p>
        )}
      </header>

      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="sql"
          language="sql"
          theme="vs-dark"
          value={sqlQuery}
          onChange={handleEditorChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            wordWrap: "on",
          }}
        />
      </div>

      <footer className="px-4 py-2 border-t border-gray-800 text-xs">
        {validation.status === "valid" && (
          <p className="text-green-400">{validation.message}</p>
        )}
        {validation.status === "error" && (
          <p className="text-red-500">{validation.message}</p>
        )}
        {validation.status === "none" && (
          <p className="text-gray-500">Digite sua consulta para validar.</p>
        )}
      </footer>
    </div>
  );
};

export default SqlEditor;
