"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

// --- Placeholder Components & Utils ---

const User = ({ className }: { className?: string }) => <span className={className}>👤</span>;
const MoreVertical = ({ className }: { className?: string }) => <span className={className}>⋮</span>;

const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

type StatusBadgeProps = {
  status: string;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: { [key: string]: string } = {
    ativo: "bg-green-100 text-green-800",
    finalizado: "bg-gray-100 text-gray-800",
    pendente: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span
      className={`px-2.5 py-1 text-xs font-medium rounded-full ${
        statusStyles[status.toLowerCase()] ?? statusStyles.pendente
      }`}
    >
      {status}
    </span>
  );
};

type MetricItemProps = {
  label: string;
  value: string | number;
};

const MetricItem: React.FC<MetricItemProps> = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-base font-semibold text-gray-800">{value}</p>
  </div>
);

// --- Main Component ---

type Contract = {
  id: string;
  title: string;
  supplier_name: string;
  status: string;
  investment: number;
  roi: number;
  duration: number;
  proofs: {
    completed: number;
    required: number;
  };
};

type ModernContractCardProps = {
  contract: Contract;
};

const ModernContractCard: React.FC<ModernContractCardProps> = ({ contract }) => {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{contract.title}</h3>
          <p className="text-sm text-gray-600 flex items-center">
            <User className="w-4 h-4 mr-1.5" />
            {contract.supplier_name}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <StatusBadge status={contract.status} />
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Métricas em Linha */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <MetricItem label="Investimento" value={formatCurrency(contract.investment)} />
        <MetricItem label="ROI" value={`${contract.roi}%`} />
        <MetricItem label="Duração" value={`${contract.duration}d`} />
      </div>

      {/* Barra de Progresso */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progresso de Comprovações</span>
          <span className="font-medium text-gray-800">{contract.proofs.completed}/{contract.proofs.required}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(contract.proofs.completed / contract.proofs.required) * 100}%` }}
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex space-x-3">
        <Button 
          variant="primary" 
          icon="📤"
          className="flex-1"
          onClick={() => router.push(`/Supplier/Proofs/Upload?contractId=${contract.id}`)}
        >
          Enviar Comprovação
        </Button>
        <Button 
          variant="outline"
          icon="📊"
          onClick={() => router.push(`/Supplier/Contracts/${contract.id}`)}
        >
          Detalhes
        </Button>
      </div>
    </div>
  );
};

export default ModernContractCard;
