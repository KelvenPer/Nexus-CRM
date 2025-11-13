import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Template = {
  id: string;
  nome: string;
  assunto: string;
  owner: string;
  status: string;
  conteudo: string;
  ultimaAtualizacao: string;
};

async function fetchTemplates(): Promise<Template[]> {
  const data = await fetchJson<Template[]>("/api/v1/automacao/templates", []);
  return Array.isArray(data) ? data : [];
}

export default async function TemplatesPage() {
  const templates = await fetchTemplates();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Automacao</p>
            <h2>Templates de E-mail</h2>
            <p className="muted">
              Centralize conteudos usados em campanhas e workflows. Cada template pode puxar dados dos objetos
              customizados.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar HTML</button>
            <button className="primary-button">Novo template</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <article key={template.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">{template.owner}</p>
                  <h3 className="text-white font-semibold">{template.nome}</h3>
                </div>
                <span className="badge">{template.status}</span>
              </div>
              <p className="text-sm text-gray-400">Assunto: {template.assunto}</p>
              <p className="text-sm text-gray-300 line-clamp-3">{template.conteudo}</p>
              <p className="text-xs text-gray-500">
                Atualizado em {new Date(template.ultimaAtualizacao).toLocaleString("pt-BR")}
              </p>
            </article>
          ))}
          {!templates.length && (
            <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center text-gray-400 col-span-full">
              Nenhum template salvo.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
