"use client";

import { useState } from "react";

type SqlPlaygroundFormProps = {
  defaultSQL: string;
};

export function SqlPlaygroundForm({ defaultSQL }: SqlPlaygroundFormProps) {
  const [objectName, setObjectName] = useState("visor_campanhas");
  const [sql, setSql] = useState(defaultSQL);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setTimeout(() => setStatus("saved"), 600);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Playground Low-Code</p>
          <h2>Salvar novo objeto</h2>
          <p className="muted">
            Apenas consultas SELECT sao aceitas. A API valida, aplica filtros de
            tenant e salva em meta_objetos.
          </p>
        </div>
      </div>
      <form className="playground-form" onSubmit={handleSubmit}>
        <label>
          Nome do objeto
          <input
            value={objectName}
            onChange={(event) => setObjectName(event.target.value)}
            placeholder="ex: tb_visao_receita"
          />
        </label>
        <label>
          Consulta SQL (somente leitura)
          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            rows={6}
          />
        </label>
        <div className="form-footer">
          <p className="muted">
            Proximo passo: enviar para POST /api/meta-object com o schema do
            tenant em uso.
          </p>
          <button type="submit" className="primary-button">
            {status === "saving" ? "Validando..." : "Salvar objeto"}
          </button>
        </div>
        {status === "saved" ? (
          <p className="success">Objeto salvo! Disponivel para o GenericDataTable.</p>
        ) : null}
      </form>
    </section>
  );
}
