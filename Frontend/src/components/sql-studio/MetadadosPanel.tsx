import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";

export interface MetadadosPayload {
  nomeAmigavel: string;
  idObjeto: string;
  descricao: string;
  sqlQuery: string;
}

export interface MetadadosPanelProps {
  sqlQuery: string;
  isTestSuccessful: boolean;
  onSaveClick: (payload: MetadadosPayload) => void;
}

export interface MetadadosPanelHandle {
  submit: () => void;
}

const MetadadosPanel = forwardRef<MetadadosPanelHandle, MetadadosPanelProps>(
  ({ sqlQuery, isTestSuccessful, onSaveClick }, ref) => {
    const [nomeAmigavel, setNomeAmigavel] = useState("");
    const [idObjeto, setIdObjeto] = useState("");
    const [descricao, setDescricao] = useState("");

    const handleSubmit = useCallback(() => {
      if (!isTestSuccessful) {
        alert("Teste a consulta com sucesso antes de salvar.");
        return;
      }

      if (!nomeAmigavel.trim() || !idObjeto.trim()) {
        alert("Preencha Nome amigavel e ID do objeto.");
        return;
      }

      onSaveClick({
        nomeAmigavel: nomeAmigavel.trim(),
        idObjeto: idObjeto.trim(),
        descricao: descricao.trim(),
        sqlQuery,
      });
    }, [
      idObjeto,
      isTestSuccessful,
      nomeAmigavel,
      onSaveClick,
      sqlQuery,
      descricao,
    ]);

    useImperativeHandle(ref, () => ({
      submit: handleSubmit,
    }));

    const isButtonDisabled =
      !isTestSuccessful || !nomeAmigavel.trim() || !idObjeto.trim();

    return (
      <aside className="p-4 bg-gray-900 h-full rounded-lg text-white border border-gray-800">
        <h2 className="text-xl font-bold mb-4 text-lime-400">Salvar objeto</h2>

        {!isTestSuccessful && (
          <div className="text-sm text-yellow-400 bg-yellow-900/40 border border-yellow-800 rounded-md p-3 mb-4">
            Rode um teste bem-sucedido para liberar o salvamento.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="nomeAmigavel"
              className="block mb-2 text-sm font-medium"
            >
              Nome amigavel
            </label>
            <input
              type="text"
              id="nomeAmigavel"
              value={nomeAmigavel}
              onChange={(event) => setNomeAmigavel(event.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5"
              placeholder="Ex: Vendas Mensais"
            />
          </div>

          <div>
            <label htmlFor="idObjeto" className="block mb-2 text-sm font-medium">
              ID do objeto
            </label>
            <input
              type="text"
              id="idObjeto"
              value={idObjeto}
              onChange={(event) => setIdObjeto(event.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5"
              placeholder="Ex: obj_vendas_mensais"
            />
          </div>

          <div>
            <label
              htmlFor="descricao"
              className="block mb-2 text-sm font-medium"
            >
              Descricao
            </label>
            <textarea
              id="descricao"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5"
              placeholder="Ex: Objeto que totaliza as vendas por mes para o dashboard principal."
            ></textarea>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            className="w-full px-4 py-2 text-black bg-lime-400 rounded-md disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-lime-500 transition-colors"
          >
            Confirmar salvamento
          </button>
          <p className="text-xs text-gray-400">
            Use o botao acima ou a acao &quot;Salvar novo objeto&quot; na barra
            superior.
          </p>
        </div>
      </aside>
    );
  }
);

MetadadosPanel.displayName = "MetadadosPanel";

export default MetadadosPanel;
