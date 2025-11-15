import type { JBPContractRecord } from "./trade";

export type SupplierDashboardExecutiveSummary = {
  total_investment: number;
  current_roi: number;
  active_contracts: number;
  completion_rate: number;
};

export type SupplierDashboardInsight = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  action?: string | null;
};

export type SupplierDashboardAlert = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  action_url?: string | null;
  created_at: string;
};

export type SupplierDashboardReportSummary = {
  id: string;
  report_type: string;
  status: string;
  period_start: string;
  period_end: string;
  file_url?: string | null;
};

export interface SupplierDashboard {
  executive_summary: SupplierDashboardExecutiveSummary;
  financial_performance: Record<string, unknown>;
  execution_tracking: Record<string, unknown>;
  recent_insights: SupplierDashboardInsight[];
  alerts: SupplierDashboardAlert[];
  recent_reports: SupplierDashboardReportSummary[];
  contracts?: JBPContractRecord[];
}

