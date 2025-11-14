"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { createCampaign } from "@/lib/marketingApi";

export default function NewCampaignPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [investimento, setInvestimento] = useState<string>("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !inicio) {
      setError("Nome e data de início são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      nome: nome.trim(),
      status,
      inicio,
      fim: fim || inicio,
      investimento: investimento ? Number(investimento.replace(",", ".")) : 0,
    };
    const created = await createCampaign(payload);
    setSubmitting(false);
    if (!created) {
      setError("Não foi possível salvar a campanha.");
      return;
    }
    router.push("/marketing/campanhas");
  };

  return (
    <AppShell>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Marketing · Nova campanha</p>
          <h2>Cadastrar nova campanha</h2>
          <p className="muted">Defina o básico. Depois evoluímos para segmentos e canais.</p>
        </div>
      </section>

      <section className="panel">
        <form className="nexus-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Nome da campanha</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="ativa">Ativa</option>
              </select>
            </label>
            <label className="form-field">
              <span>Data de início</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </label>
            <label className="form-field">
              <span>Data de término</span>
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Investimento (R$)</span>
              <input type="number" min="0" step="0.01" value={investimento} onChange={(e) => setInvestimento(e.target.value)} />
            </label>
          </div>

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <div className="form-actions">
            <button type="button" className="ghost-button" onClick={() => router.back()} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar campanha"}
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}

