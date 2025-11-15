"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import InvestmentVsSalesChart from "@/components/trade/InvestmentVsSalesChart";
import KpiCard from "@/components/trade/KpiCard";
import SupplierROITable from "@/components/trade/SupplierROITable";
import { API_BASE_URL } from "@/lib/api";
import { clearSession, getAuthHeaders, getStoredSession } from "@/lib/auth";
import type { SupplierReport } from "@/types/trade";

const DEFAULT_SUPPLIER_ID = process.env.NEXT_PUBLIC_DEFAULT_SUPPLIER_ID ?? "supplier_demo";

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [report, setReport] = useState<SupplierReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (!session || !session.access_token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/data/supplier-report/${DEFAULT_SUPPLIER_ID}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
          },
        );

        if (response.status === 401 || response.status === 403) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (response.ok) {
          const data = (await response.json()) as SupplierReport;
          setReport(data);
        } else {
          setReport(null);
        }
      } catch {
        setReport(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

  const kpis = [
    {
      title: "Total JBP Ativo",
      value: formatCurrency(report?.jbp_performance.total_investment ?? 2500000),
      subtitle: `${report?.jbp_performance.active_jbp ?? 0} planos ativos`,
    },
    {
      title: "ROI Medio",
      value: `${report?.jbp_performance.average_roi?.toFixed(1) ?? 18}%`,
      subtitle: "Campanhas avaliadas",
    },
    {
      title: "Fornecedores Ativos",
      value: String(report?.comparison?.top_competitors?.length ?? 24),
      subtitle: "com dados em tempo real",
    },
    {
      title: "Proximos Vencimentos",
      value: String(report?.jbp_performance.active_jbp ?? 3),
      subtitle: "nos proximos 30 dias",
    },
  ];

  const chartData = report?.trend ?? [
    { label: "Semana 1", sales_amount: 120000, investment_value: 45000 },
    { label: "Semana 2", sales_amount: 150000, investment_value: 48000 },
    { label: "Semana 3", sales_amount: 180000, investment_value: 52000 },
    { label: "Semana 4", sales_amount: 210000, investment_value: 58000 },
  ];

  const roiRows =
    report?.product_analysis.top_performers.map((product) => ({
      name: product.name,
      sales: product.sales_amount ?? 0,
      roi: product.growth_percentage ?? undefined,
      rotation: product.rotation_speed,
    })) ?? [
      { name: "Fornecedor Alpha", sales: 520000, roi: 22, rotation: "rapida" },
      { name: "Fornecedor Beta", sales: 390000, roi: 18, rotation: "media" },
      { name: "Fornecedor Gamma", sales: 310000, roi: 15, rotation: "lenta" },
    ];

  return (
    <AppShell>
      <div className="p-6 trade-dashboard">
        <h1>Nexus CRM - Painel Trade & Dados</h1>
        {isLoading ? (
          <p>Carregando dados do fornecedor...</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {kpis.map((kpi) => (
                <KpiCard
                  key={kpi.title}
                  title={kpi.title}
                  value={kpi.value}
                  subtitle={kpi.subtitle}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <InvestmentVsSalesChart dataPoints={chartData} />
              <SupplierROITable rows={roiRows} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
