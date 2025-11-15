"use client";

import React from "react";
import KpiCard from "@/components/ui/KpiCard";
import ModernContractCard from "@/components/trade/ModernContractCard";

// --- Mock Data ---
const contracts = [
  {
    id: "ctx_1",
    title: "JBP Anual 2024",
    supplier_name: "Fornecedor Principal",
    status: "Ativo",
    investment: 75000,
    roi: 15.2,
    duration: 365,
    proofs: { completed: 8, required: 12 },
  },
  {
    id: "ctx_2",
    title: "Campanha de Verão",
    supplier_name: "Fornecedor Principal",
    status: "Ativo",
    investment: 25000,
    roi: 32.8,
    duration: 90,
    proofs: { completed: 2, required: 4 },
  },
  {
    id: "ctx_3",
    title: "Ação Dia das Mães",
    supplier_name: "Fornecedor Secundário",
    status: "Pendente",
    investment: 15000,
    roi: 0,
    duration: 45,
    proofs: { completed: 0, required: 2 },
  },
];

// --- Placeholder Components ---

const NotificationsBell = () => (
  <button className="text-gray-500 hover:text-gray-700">
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
  </button>
);

const UserProfileMenu = () => (
  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
    FP
  </div>
);

const SectionHeader = ({ title, action }: { title: string, action: { label: string, onClick: () => void } }) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    <button onClick={action.onClick} className="text-sm font-medium text-primary-600 hover:text-primary-700">
      {action.label}
    </button>
  </div>
);

const QuickActionsPanel = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
    <div className="space-y-3">
      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">Enviar Comprovação</button>
      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">Ver Relatórios</button>
      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">Falar com Suporte</button>
    </div>
  </div>
);

const RecentActivity = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="font-semibold text-gray-800 mb-4">Atividade Recente</h3>
    <ul className="space-y-3 text-sm">
      <li>Comprovação para 'JBP Anual' aprovada.</li>
      <li>Novo contrato 'Campanha de Inverno' adicionado.</li>
      <li>Relatório de ROI de Outubro já está disponível.</li>
    </ul>
  </div>
);

const InsightsPanel = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="font-semibold text-gray-800 mb-4">Insights</h3>
    <p className="text-sm text-gray-600">A campanha de verão está com um ROI 30% acima do esperado. Considere alocar mais verba.</p>
  </div>
);


// --- Refactored Page ---

export default function SupplierPortalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Moderno */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Nexus CRM</h1>
                <p className="text-sm text-gray-500">Portal do Fornecedor</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationsBell />
              <UserProfileMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo de volta, Fornecedor!
          </h1>
          <p className="text-lg text-gray-600">
            Aqui está o resumo da sua performance.
          </p>
        </div>

        {/* KPIs em Grid Moderna */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="ROI Total"
            value="28.3%"
            trend={{ direction: 'up', value: '+3.2%' }}
            icon="📈"
            color="success"
          />
          <KpiCard
            title="Investimento Ativo" 
            value="R$ 115.000"
            trend={{ direction: 'up', value: '+12.5%' }}
            icon="💰"
            color="primary"
          />
          <KpiCard
            title="Taxa de Execução"
            value="85%"
            trend={{ direction: 'up', value: '+8.1%' }}
            icon="✅"
            color="primary"
          />
          <KpiCard
            title="Contratos Ativos"
            value="3"
            trend={{ direction: 'neutral', value: '0' }}
            icon="📝"
            color="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contratos Ativos */}
          <div className="lg:col-span-2">
            <SectionHeader 
              title="Meus Contratos Ativos"
              action={{ label: "Ver todos", onClick: () => {} }}
            />
            <div className="space-y-4">
              {contracts.map(contract => (
                <ModernContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          </div>

          {/* Sidebar de Ações */}
          <div className="space-y-6">
            <QuickActionsPanel />
            <RecentActivity />
            <InsightsPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
