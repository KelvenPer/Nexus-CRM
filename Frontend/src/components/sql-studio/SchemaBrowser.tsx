import React, { useState, useEffect } from "react";

interface SchemaBrowserProps {
  onInsertReference: (name: string) => void;
  refreshKey: number;
}

interface SchemasResponse {
  tabelasBase?: string[];
  objetosCustom?: string[];
}

const SchemaBrowser: React.FC<SchemaBrowserProps> = ({
  onInsertReference,
  refreshKey,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [tabelasBaseList, setTabelasBaseList] = useState<string[]>([]);
  const [objetosCustomList, setObjetosCustomList] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBaseUrl =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "")
      : "";

  useEffect(() => {
    let isMounted = true;

    const fetchSchemas = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
        const response = await fetch(`${apiBaseUrl}/api/v1/dados/meta/schemas`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error(`Erro ao carregar schemas (${response.status})`);
        }

        const data: SchemasResponse = await response.json();
        if (!isMounted) return;

        setTabelasBaseList(Array.isArray(data.tabelasBase) ? data.tabelasBase : []);
        setObjetosCustomList(
          Array.isArray(data.objetosCustom) ? data.objetosCustom : []
        );
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorMessage("Nao foi possivel carregar os schemas.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSchemas();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, refreshKey]);

  const renderList = (title: string, items: string[]) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase mb-3">
        {title} <span className="text-lime-400">({items.length})</span>
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", item)}
            onClick={() => onInsertReference(item)}
            className="px-3 py-1.5 bg-gray-900 rounded-md text-gray-200 hover:text-lime-300 hover:bg-gray-800 cursor-pointer transition-colors"
            title="Clique para inserir no editor"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <aside className="p-4 bg-black h-full text-white border border-gray-800 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-lime-400">Navegador</h2>
        {isLoading ? (
          <span className="text-xs text-gray-400">Sincronizando...</span>
        ) : (
          <span className="text-xs text-gray-500">atualizado</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-full space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400" />
          <p className="text-sm text-gray-400">Carregando objetos</p>
        </div>
      ) : errorMessage ? (
        <p className="text-sm text-red-400">{errorMessage}</p>
      ) : (
        <>
          {renderList("Tabelas base", tabelasBaseList)}
          {renderList("Objetos customizados", objetosCustomList)}
        </>
      )}
    </aside>
  );
};

export default SchemaBrowser;
