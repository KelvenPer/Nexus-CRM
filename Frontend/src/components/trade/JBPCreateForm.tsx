"use client";

import { useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import type { JBPDetailResponse } from "@/types/trade";

type FormState = {
  supplier_id: string;
  title: string;
  investment_value: string;
  start_date: string;
  end_date: string;
};

const initialState: FormState = {
  supplier_id: "",
  title: "",
  investment_value: "",
  start_date: "",
  end_date: "",
};

export default function JBPCreateForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });
  const [result, setResult] = useState<JBPDetailResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "idle" });
    setResult(null);

    const payload = {
      ...form,
      investment_value: Number(form.investment_value),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/trade/jbp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Erro ao criar JBP");
      }
      const data = (await response.json()) as JBPDetailResponse;
      setResult(data);
      setStatus({ type: "success", message: "JBP criado com sucesso!" });
      setForm(initialState);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Nao foi possivel criar o JBP." });
    } finally {
      setSubmitting(false);
    }
  }

  const fields: Array<{ name: keyof FormState; label: string; type: string; placeholder: string }> = [
    { name: "supplier_id", label: "Fornecedor", type: "text", placeholder: "supplier_demo" },
    { name: "title", label: "Titulo do plano", type: "text", placeholder: "Trade Boost" },
    { name: "investment_value", label: "Investimento (R$)", type: "number", placeholder: "250000" },
    { name: "start_date", label: "Inicio", type: "date", placeholder: "" },
    { name: "end_date", label: "Fim", type: "date", placeholder: "" },
  ];

  return (
    <form className="card jbp-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        {fields.map((field) => (
          <label key={field.name} className="form-field">
            <span>{field.label}</span>
            <input
              required
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              value={form[field.name]}
              onChange={handleChange(field.name)}
            />
          </label>
        ))}
      </div>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : "Criar JBP"}
      </button>
      {status.type !== "idle" ? (
        <p className={`form-status form-status-${status.type}`}>{status.message}</p>
      ) : null}

      {result ? (
        <div className="form-result">
          <p>
            <strong>Plano:</strong> {result.plan.title} ({result.plan.status})
          </p>
          <p>
            <strong>Fornecedor:</strong> {result.supplier.name}
          </p>
        </div>
      ) : null}
    </form>
  );
}
