import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Ticket = {
  id: string;
  cliente: string;
  canal: string;
  assunto: string;
  prioridade: string;
  status: string;
  owner: string;
  sla: string;
};

async function fetchTickets(): Promise<Ticket[]> {
  const data = await fetchJson<Ticket[]>("/api/v1/solucoes/atendimento/tickets", []);
  return Array.isArray(data) ? data : [];
}

export default async function AtendimentoPage() {
  const tickets = await fetchTickets();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Atendimento</p>
            <h2>SLAs e tickets</h2>
            <p className="muted">
              Consolide chamados por prioridade e canal, garantindo que os SLAs definidos com o cliente sejam cumpridos.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Adicionar canal</button>
            <button className="primary-button">Novo ticket</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">{ticket.assunto}</h3>
                <span className="badge">{ticket.status}</span>
              </div>
              <p className="eyebrow">{ticket.cliente}</p>
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>{ticket.canal}</span>
                <span>Prioridade: {ticket.prioridade}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Owner: {ticket.owner}</span>
                <span>SLA: {ticket.sla}</span>
              </div>
            </article>
          ))}
          {!tickets.length && (
            <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center text-gray-400 col-span-full">
              Nenhum ticket aberto.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
