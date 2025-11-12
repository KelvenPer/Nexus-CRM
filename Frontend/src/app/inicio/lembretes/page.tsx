import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Reminder = {
  id: string;
  title: string;
  customer: string;
  dueDate: string;
  status: string;
  badge: string;
  urgency: string;
};

type ReminderResponse = {
  items?: Reminder[];
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function fetchReminders(): Promise<Reminder[]> {
  const payload = await fetchJson<ReminderResponse>("/api/v1/inicio/lembretes", { items: [] });
  return Array.isArray(payload.items) ? payload.items : [];
}

const urgencyColors: Record<string, string> = {
  Alto: "badge danger",
  Normal: "badge",
};

export default async function LembretesPage() {
  const reminders = await fetchReminders();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Alertas inteligentes</p>
            <h2>Lembretes configurados pelo tenant</h2>
            <p className="muted">
              Todos os lembretes derivam de atividades, SLAs de atendimento e gatilhos definidos na automacao.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Gerenciar regras</button>
            <button className="primary-button">Criar lembrete</button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reminders.map((reminder) => (
            <article
              key={reminder.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={urgencyColors[reminder.urgency] ?? "badge"}>
                  {reminder.urgency}
                </span>
                <span className="text-sm text-gray-400">
                  {dateFormatter.format(new Date(reminder.dueDate))}
                </span>
              </div>
              <div>
                <p className="eyebrow">{reminder.customer}</p>
                <h3 className="text-lg text-white font-semibold">{reminder.title}</h3>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span className="badge">{reminder.badge}</span>
                <span className="status-pill">{reminder.status}</span>
              </div>
            </article>
          ))}
          {!reminders.length && (
            <div className="p-6 border border-dashed border-gray-700 rounded-xl text-center text-gray-400 col-span-full">
              Nenhum lembrete configurado ainda.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
