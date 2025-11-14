import AppShell from "@/components/layout/AppShell";
import JBPCreateForm from "@/components/trade/JBPCreateForm";

export default function JBPCreationPage() {
  return (
    <AppShell>
      <div className="p-6 trade-page">
        <h1>Criar novo JBP</h1>
        <p className="muted">Defina os cinco campos essenciais para ativar um novo plano conjunto.</p>
        <JBPCreateForm />
      </div>
    </AppShell>
  );
}
