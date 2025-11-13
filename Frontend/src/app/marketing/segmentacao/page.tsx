import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Segment = {
  id: string;
  nome: string;
  regra: string;
  tamanho: number;
};

async function fetchSegments(): Promise<Segment[]> {
  const data = await fetchJson<Segment[]>("/api/v1/marketing/segmentos", []);
  return Array.isArray(data) ? data : [];
}

export default async function SegmentacaoPage() {
  const segments = await fetchSegments();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Segmentacao</p>
            <h2>Construtor de audiencias</h2>
            <p className="muted">
              Audiencias alimentam campanhas, automacoes e gatilhos baseados em dados. A mesma regra pode ser reutilizada
              no BI.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Duplicar segmentacao</button>
            <button className="primary-button">Nova audiencia</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {segments.map((segment) => (
            <article key={segment.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-white font-semibold">{segment.nome}</h3>
                <span className="badge">{segment.tamanho} contas</span>
              </div>
              <p className="text-sm text-gray-300">{segment.regra}</p>
            </article>
          ))}
          {!segments.length && (
            <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center text-gray-400 col-span-full">
              Nenhuma segmentacao criada.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
