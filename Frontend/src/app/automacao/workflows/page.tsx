import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Workflow = {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  ultimaExecucao?: string | null;
};

async function fetchWorkflows(): Promise<Workflow[]> {
  const data = await fetchJson<Workflow[]>("/api/v1/automacao/workflows", []);
  return Array.isArray(data) ? data : [];
}

export default async function WorkflowsPage() {
  const workflows = await fetchWorkflows();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Automacao</p>
            <h2>Workflows (Fluxos)</h2>
            <p className="muted">
              Orquestre tarefas, atualizacoes e comunicacoes acionadas por eventos. Cada fluxo pode ser usado em
              marketing, vendas ou dados.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Duplicar fluxo</button>
            <button className="primary-button">Novo workflow</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {workflows.map((workflow) => (
            <article key={workflow.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">{workflow.nome}</h3>
                <span className="badge">{workflow.status}</span>
              </div>
              <p className="text-sm text-gray-300">{workflow.descricao}</p>
              <p className="text-xs text-gray-500">
                Ultima execucao:{" "}
                {workflow.ultimaExecucao
                  ? new Date(workflow.ultimaExecucao).toLocaleString("pt-BR")
                  : "Nunca executado"}
              </p>
            </article>
          ))}
          {!workflows.length && (
            <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center text-gray-400 col-span-full">
              Nenhum workflow configurado.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
