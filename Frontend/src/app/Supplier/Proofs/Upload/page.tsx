"use client";

import AppShell from "@/components/layout/AppShell";
import { API_BASE_URL } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function UploadProofPage() {
  const params = useSearchParams();
  const assetId = params.get("asset") ?? "";
  const [formState, setFormState] = useState({
    asset_id: assetId,
    proof_type: "image",
    url: "",
    description: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Enviando...");
    try {
      const response = await fetch(`${API_BASE_URL}/api/trade/assets/${formState.asset_id}/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_type: formState.proof_type,
          url: formState.url,
          description: formState.description,
        }),
      });
      if (!response.ok) {
        throw new Error("Erro ao enviar prova");
      }
      setStatus("Prova enviada com sucesso!");
      setFormState((prev) => ({ ...prev, url: "", description: "" }));
    } catch (error) {
      console.error(error);
      setStatus("Falha ao enviar prova.");
    }
  }

  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>Enviar comprovação</h1>
        <form className="card jbp-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>ID do ativo</span>
            <input
              value={formState.asset_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, asset_id: event.target.value }))}
              required
            />
          </label>
          <label className="form-field">
            <span>Tipo</span>
            <select
              value={formState.proof_type}
              onChange={(event) => setFormState((prev) => ({ ...prev, proof_type: event.target.value }))}
            >
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="screenshot">Screenshot</option>
              <option value="report">Relatório</option>
              <option value="analytics">Analytics</option>
            </select>
          </label>
          <label className="form-field">
            <span>URL</span>
            <input
              type="url"
              placeholder="https://"
              value={formState.url}
              onChange={(event) => setFormState((prev) => ({ ...prev, url: event.target.value }))}
              required
            />
          </label>
          <label className="form-field">
            <span>Descrição</span>
            <input
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <button className="primary-button" type="submit">
            Enviar
          </button>
          {status ? <p className="form-status">{status}</p> : null}
        </form>
      </div>
    </AppShell>
  );
}
