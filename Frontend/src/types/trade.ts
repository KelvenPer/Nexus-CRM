export type Supplier = {
  id: string;
  name: string;
  category?: string | null;
  business_size?: string | null;
  priority_level?: number | null;
  payment_terms?: string | null;
};

export type ROIProjection = {
  basic_roi?: Record<string, number | null>;
  incremental_roi?: Record<string, number | null>;
  causality_confidence?: Record<string, number | null>;
  future_projection?: Record<string, number | null>;
  recommendations?: string[];
};

export type JBPPlan = {
  id: string;
  supplier_id: string;
  title: string;
  description?: string | null;
  investment_value: number;
  investment_type?: string | null;
  start_date: string;
  end_date: string;
  expected_roi?: number | null;
  counter_parties: string[];
  exclusive_benefits: string[];
  sales_target?: number | null;
  growth_target?: number | null;
  status: "draft" | "approved" | "active" | "completed" | "cancelled";
};

export type JBPDetailResponse = {
  plan: JBPPlan;
  supplier: Supplier;
  roi?: ROIProjection | null;
};

export type JBPListResponse = {
  items: JBPPlan[];
  total: number;
};

export type ProofRequirement = {
  type: "image" | "video" | "screenshot" | "report" | "analytics";
  description: string;
  is_required?: boolean;
};

export type AssetProof = {
  id: string;
  proof_type: ProofRequirement["type"];
  url: string;
  description?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
  verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
};

export type ProofDashboardAsset = {
  asset_id: string;
  asset_name: string;
  status: string;
  scheduled_period: string;
  proof_types: { type: string; status: string; date?: string | null }[];
  metrics: Record<string, unknown>;
};

export type ProofDashboard = {
  contract_id: string;
  supplier_name: string;
  period: string;
  executive_summary: {
    total_investment: number;
    assets_contracted: number;
    assets_executed: number;
    assets_verified: number;
    completion_percentage: number;
  };
  assets_status: ProofDashboardAsset[];
  proof_center: {
    pending_approvals: number;
    missing_proofs: number;
    next_deadlines: string[];
  };
};

export type JBPContractRecord = {
  id: string;
  supplier_id: string;
  title: string;
  status: string;
  total_investment: number;
  start_date: string;
  end_date: string;
  proof_status: string;
  completion_percentage: number;
};

export type ProofHistoryEntry = {
  contract_id: string;
  asset_name: string;
  proof_type: string;
  url: string;
  uploaded_at: string;
  status: string;
};

export type ProofHistoryResponse = {
  entries: ProofHistoryEntry[];
};

export type SupplierPortalResponse = {
  executive_summary: {
    active_investment: string;
    total_return: string;
    current_roi: string;
    contract_status: string;
  };
  financial_performance: {
    roi_evolution: number[];
    sales_trend: {
      current: number;
      previous: number;
      growth: number;
    };
    market_share: {
      current: number;
      trend: string;
    };
  };
  execution_proof: {
    assets_contracted: number;
    assets_executed: number;
    assets_verified: number;
    proof_status: { asset: string; status: string; proofs: number }[];
  };
  actionable_insights: {
    type: string;
    title: string;
    reason: string;
    expected_impact: string;
    confidence: number;
    action: string;
  }[];
  competitive_report?: Record<string, unknown> | null;
};

export type SupplierAlert = {
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  action: string;
  created_at?: string;
};

export type WeeklyEmailReport = {
  subject: string;
  greeting: string;
  financial_highlights: Record<string, unknown>;
  proof_updates: string[];
  featured_recommendation: string;
  cta_links: { label: string; url: string }[];
};

export type Insight = {
  id: string;
  type: string;
  title: string;
  message: string;
  action?: string | null;
  priority: "critical" | "high" | "medium" | "low";
  confidence?: number | null;
  data_points: string[];
  expected_impact: "high" | "medium" | "low";
  timeline: "immediate" | "next_30_days" | "next_90_days";
  score?: number | null;
};

export type SalesTrendPoint = {
  label: string;
  sales_amount: number;
  investment_value?: number | null;
};

export type SupplierReport = {
  supplier: Supplier;
  summary: {
    supplier_name: string;
    period: string;
    total_sales: number;
    growth_percentage?: number | null;
    market_share?: number | null;
  };
  trend: SalesTrendPoint[];
  jbp_performance: {
    active_jbp: number;
    total_investment: number;
    average_roi?: number | null;
    goal_achievement?: number | null;
  };
  product_analysis: {
    top_performers: {
      id?: string;
      name: string;
      sales_amount?: number | null;
      growth_percentage?: number | null;
      rotation_speed?: string | null;
    }[];
    low_performers: {
      id?: string;
      name: string;
      sales_amount?: number | null;
      growth_percentage?: number | null;
    }[];
    opportunities: {
      id?: string;
      name: string;
      sales_amount?: number | null;
      growth_percentage?: number | null;
    }[];
  };
  insights: Insight[];
  comparison?: {
    supplier_performance?: Record<string, unknown>;
    market_average?: Record<string, unknown>;
    top_competitors?: Record<string, unknown>[];
    positioning?: Record<string, unknown>;
  };
  roi_snapshot?: Record<string, unknown> | null;
};
