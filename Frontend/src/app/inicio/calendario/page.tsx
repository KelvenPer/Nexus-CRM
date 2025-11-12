import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type CalendarEvent = {
  title: string;
  customer: string;
  status: string;
  date: string;
};

type CalendarResponse = {
  events?: CalendarEvent[];
};

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

async function fetchCalendar(): Promise<Record<string, CalendarEvent[]>> {
  const payload = await fetchJson<CalendarResponse>("/api/v1/inicio/calendario", { events: [] });
  const grouped: Record<string, CalendarEvent[]> = {};
  (payload.events ?? []).forEach((event) => {
    const dateKey = event.date ? event.date.slice(0, 10) : "Sem data";
    grouped[dateKey] = grouped[dateKey] ? [...grouped[dateKey], event] : [event];
  });
  return grouped;
}

export default async function CalendarioPage() {
  const groupedEvents = await fetchCalendar();
  const dateKeys = Object.keys(groupedEvents).sort();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Calendario inteligente</p>
            <h2>Reunioes e checkpoints do tenant</h2>
            <p className="muted">
              Sincronize pipeline com follow-ups criticos, planejamentos de trade e SLAs de atendimento em um calendario
              unico.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Sincronizar Google</button>
            <button className="primary-button">Nova reuniao</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Próximos dias</p>
              <h3>Agenda consolidada</h3>
            </div>
          </div>
          {!dateKeys.length && (
            <div className="p-6 text-center text-sm text-gray-400">Nenhum evento encontrado para o calendario.</div>
          )}
          <div className="space-y-4">
            {dateKeys.map((dateKey) => (
              <article
                key={dateKey}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3"
              >
                <header className="flex items-center justify-between">
                  <strong>{dayFormatter.format(new Date(dateKey))}</strong>
                  <span className="text-sm text-gray-400">
                    {groupedEvents[dateKey].length} evento(s)
                  </span>
                </header>
                <ul className="space-y-3">
                  {groupedEvents[dateKey].map((event, index) => (
                    <li
                      key={`${dateKey}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-3"
                    >
                      <div>
                        <p className="eyebrow">{event.customer}</p>
                        <strong>{event.title}</strong>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="badge">{event.status}</span>
                        <div className="text-sm text-gray-300">
                          {timeFormatter.format(new Date(event.date))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
