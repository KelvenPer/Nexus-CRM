import AppShell from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";

type Account = {
  id: string;
  nome: string;
  segmento: string;
  cidade?: string;
  estado?: string;
};

type Contact = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  conta?: string;
};

async function fetchAccountsAndContacts() {
  const [accounts, contacts] = await Promise.all([
    fetchJson<Account[]>("/api/v1/vendas/contas", []),
    fetchJson<Contact[]>("/api/v1/vendas/contatos", []),
  ]);
  return {
    accounts: Array.isArray(accounts) ? accounts : [],
    contacts: Array.isArray(contacts) ? contacts : [],
  };
}

export default async function ContasContatosPage() {
  const { accounts, contacts } = await fetchAccountsAndContacts();

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Contas e contatos</p>
            <h2>Base relacional do tenant</h2>
            <p className="muted">
              Gerencie as contas chave e seus decisores principais. Esta visao alimenta workflows, campanhas e
              segmentacoes.
            </p>
          </div>
          <div className="hero-actions">
            <button className="ghost-button">Importar ERP</button>
            <button className="primary-button">Nova conta</button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Empresas</p>
                <h3>Contas ativas</h3>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Segmento</th>
                    <th>Cidade</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.nome}</td>
                      <td>{account.segmento}</td>
                      <td>
                        {account.cidade ? `${account.cidade}${account.estado ? `/${account.estado}` : ""}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!accounts.length && (
                <div className="p-4 text-center text-sm text-gray-400">Nenhuma conta cadastrada.</div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Decisores</p>
                <h3>Contatos principais</h3>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Conta</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.nome}</td>
                      <td className="text-gray-300">{contact.email}</td>
                      <td>{contact.conta ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!contacts.length && (
                <div className="p-4 text-center text-sm text-gray-400">Nenhum contato cadastrado.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
