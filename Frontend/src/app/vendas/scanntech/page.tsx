"use client";

import AppShell from "@/components/layout/AppShell";
import { API_BASE_URL } from "@/lib/auth";
import React, { useEffect, useState } from "react";
import LineChart from "@/components/charts/LineChart";
import { useLineData } from "@/hooks/useChartData";

type Kpi = { label: string; value: number; change: number };
type Tendencia = { labels: string[]; values: number[] };
type TopItem = { nome: string; valor: number; prazo: string };
type LojaKpi = { loja: string; receita: number; conversao: number };

export default function ScanntechPage() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [tendencia, setTendencia] = useState<Tendencia | null>(null);
  const [top, setTop] = useState<TopItem[]>([]);
  const [porLoja, setPorLoja] = useState<LojaKpi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string>("6m");
  const [loja, setLoja] = useState<string>("Todas");

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("nexus_token") : null;
        const params = new URLSearchParams({ periodo });
        if (loja && loja !== "Todas") params.set("loja", loja);
        const res = await fetch(`${API_BASE_URL}/api/v1/vendas/scanntech/indicadores?${params.toString()}`,
        {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`Falha ao carregar (${res.status})`);
        const data = (await res.json()) as { kpis: Kpi[]; tendencia: Tendencia; topOportunidades: TopItem[]; porLoja: LojaKpi[] };
        if (!active) return;
        setKpis(data.kpis ?? []);
        setTendencia(data.tendencia ?? null);
        setTop(data.topOportunidades ?? []);
        setPorLoja(data.porLoja ?? []);
      } catch (e) {
        console.error(e);
        if (active) setError("Nao foi possivel carregar os indicadores da Scanntech.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [periodo, loja]);

  const Chart = ({ serie }: { serie: Tendencia }) => {
    const data = useLineData(serie.labels, serie.values, "Receita");
    return <LineChart data={data} height={260} />;
  };

  return (
    <AppShell>
      <section className="data-header" style={{ borderRadius: 16, marginBottom: 16, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">Vendas</p>
            <h1>Scanntech</h1>
            <p className="muted">Integração de dados transacionais e performance comercial.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ghost-button">
              <option value="3m">3 meses</option>
              <option value="6m">6 meses</option>
              <option value="12m">12 meses</option>
            </select>
            <select value={loja} onChange={(e) => setLoja(e.target.value)} className="ghost-button">
              <option>Todas</option>
              <option>Loja A</option>
              <option>Loja B</option>
              <option>Loja C</option>
            </select>
            <button className="primary-button">+ Novo Relatório</button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="panel" style={{ padding: 24, textAlign: "center" }}>Carregando...</div>
      ) : error ? (
        <div className="panel" style={{ padding: 24, textAlign: "center", color: "#fca5a5" }}>{error}</div>
      ) : (
        <>
          <section className="overview-cards" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
            {kpis.map((kpi) => (
              <article key={kpi.label} className="panel" style={{ padding: 16, borderTop: "4px solid var(--accent)" }}>
                <p className="muted" style={{ marginBottom: 4 }}>{kpi.label}</p>
                <h3 style={{ fontSize: 28, fontWeight: 800 }}>{
                  kpi.label.toLowerCase().includes("receita") || kpi.label.toLowerCase().includes("ticket")
                    ? kpi.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : kpi.value.toLocaleString("pt-BR")
                }</h3>
                <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                  <span className={kpi.change >= 0 ? "badge success" : "badge"}>
                    {kpi.change > 0 ? "+" : ""}
                    {kpi.change}
                    {kpi.label.toLowerCase().includes("conversao") ? " pts" : "%"}
                  </span>
                  <span style={{ marginLeft: 8 }}>vs. período anterior</span>
                </div>
              </article>
            ))}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            <div className="panel" style={{ padding: 16 }}>
              <h2 style={{ marginBottom: 12 }}>Receita Mensal (Últimos 6 meses)</h2>
              <div style={{ height: 260, borderRadius: 12, border: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--nav-muted)" }}>
                {tendencia ? <Chart serie={tendencia} /> : "Sem série de tendência"}
              </div>
            </div>

            <div className="panel" style={{ padding: 16 }}>
              <h2 style={{ marginBottom: 12 }}>Top 5 Oportunidades</h2>
              <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {top.map((item) => (
                  <li key={item.nome} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{item.nome}</p>
                      <p className="muted" style={{ fontSize: 12 }}>Prazo: {item.prazo}</p>
                    </div>
                    <strong style={{ color: "#34d399" }}>{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel" style={{ padding: 16, marginTop: 16 }}>
            <h2 style={{ marginBottom: 12 }}>KPIs por Loja</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
              {porLoja.map((l) => (
                <div key={l.loja} className="panel" style={{ padding: 12 }}>
                  <p className="eyebrow">{l.loja}</p>
                  <strong style={{ fontSize: 22 }}>{l.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  <p className="muted">Conversão: {l.conversao.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
