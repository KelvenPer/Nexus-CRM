"use client";

import { SupplierPortalLayout } from "@/components/supplier-portal/Layout";
import { JBPContractCard } from "@/components/trade/JBPContractCard";
import { useSupplierDashboard } from "@/hooks/useSupplierDashboard";
import { useSupplierNotifications } from "@/hooks/useSupplierNotifications";
import { useSupplierContracts } from "@/hooks/useSupplierContracts";

const DEFAULT_SUPPLIER_ID = process.env.NEXT_PUBLIC_DEFAULT_SUPPLIER_ID ?? "supplier_demo";

export default function SupplierPortalPage() {
  const supplierId = DEFAULT_SUPPLIER_ID;
  const { data, isLoading } = useSupplierDashboard(supplierId);
  const { notifications, unreadCount } = useSupplierNotifications(supplierId);
  const { contracts } = useSupplierContracts(supplierId);

  const summary = data?.executive_summary;

  return (
    <SupplierPortalLayout>
      <div className="space-y-6">
        <header>
          <h1>Painel Executivo do Fornecedor</h1>
          <p className="muted">Resumo em tempo real do ROI, execucao e recomendacoes.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="kpi-card trade-kpi-card">
            <p className="kpi-card-title">ROI Atual</p>
            <strong className="kpi-card-value">
              {isLoading || !summary ? "..." : `${summary.current_roi.toFixed(1)}%`}
            </strong>
          </div>
          <div className="kpi-card trade-kpi-card">
            <p className="kpi-card-title">Investimento ativo</p>
            <strong className="kpi-card-value">
              {isLoading || !summary
                ? "..."
                : summary.total_investment.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
            </strong>
          </div>
          <div className="kpi-card trade-kpi-card">
            <p className="kpi-card-title">Execucao</p>
            <strong className="kpi-card-value">
              {isLoading || !summary ? "..." : `${summary.completion_rate.toFixed(0)}%`}
            </strong>
          </div>
          <div className="kpi-card trade-kpi-card">
            <p className="kpi-card-title">Contratos ativos</p>
            <strong className="kpi-card-value">{contracts.length || "0"}</strong>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">Contratos ativos</h2>
            {contracts.length === 0 ? (
              <p className="muted">Nenhum contrato ativo encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contracts.map((contract) => (
                  <JBPContractCard
                    key={contract.id}
                    id={contract.id}
                    title={contract.title}
                    supplierName={contract.supplier_name}
                    status={contract.status}
                    investment={contract.total_investment}
                    roi={contract.current_roi}
                    proofs={{
                      completed: contract.proofs_completed ?? 0,
                      required: contract.proofs_required ?? 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <section className="card">
              <h2 className="text-lg font-semibold mb-2">Insights recentes</h2>
              <ul className="insight-list">
                {data?.recent_insights?.length
                  ? data.recent_insights.map((insight) => (
                      <li key={insight.id}>
                        <strong>{insight.title}</strong>
                        <p className="muted">{insight.message}</p>
                      </li>
                    ))
                  : (
                    <li className="muted text-sm">Sem insights disponiveis.</li>
                    )}
              </ul>
            </section>
            <section className="card">
              <h2 className="text-lg font-semibold mb-2">Notificacoes ({unreadCount})</h2>
              <ul className="insight-list text-sm">
                {notifications.slice(0, 5).map((notification) => (
                  <li key={notification.id}>
                    <strong>{notification.title}</strong>
                    <p className="muted">{notification.message}</p>
                  </li>
                ))}
                {notifications.length === 0 ? (
                  <li className="muted text-sm">Sem notificacoes no momento.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </section>
      </div>
    </SupplierPortalLayout>
  );
}
