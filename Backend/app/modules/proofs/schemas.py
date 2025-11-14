"""Pydantic schemas for the proof module."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


ProofType = Literal["image", "video", "screenshot", "report", "analytics"]


class ProofRequirement(BaseModel):
    type: ProofType
    description: str
    is_required: bool = True


class ProofTemplate(BaseModel):
    name: str
    instructions: str
    required_fields: List[str] = Field(default_factory=list)


class AssetCatalog(BaseModel):
    id: str
    name: str
    category: Literal["digital", "physical", "print", "promotional"]
    description: str
    expected_metrics: List[str]
    proof_requirements: List[ProofRequirement]
    default_duration: int
    default_cost: float
    available_channels: List[str]
    proof_templates: List[ProofTemplate] = Field(default_factory=list)


class AssetProof(BaseModel):
    id: str
    proof_type: ProofType
    url: str
    description: str | None = None
    uploaded_by: str | None = None
    uploaded_at: datetime
    verified: bool = False
    verified_by: str | None = None
    verified_at: datetime | None = None


class AssetProofCreate(BaseModel):
    proof_type: ProofType
    url: str
    description: str | None = None


class AutomatedProof(BaseModel):
    id: str
    source: str
    metric: str
    target_value: float | None = None
    value: float | None = None
    captured_at: datetime | None = None
    status: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class AutomatedProofSetupResponse(BaseModel):
    entries: List[AutomatedProof]


class ProofStatus(BaseModel):
    pending_approvals: int
    missing_proofs: int
    next_deadlines: List[str]


class JBPAsset(BaseModel):
    id: str
    asset_catalog_id: str
    asset_name: str
    placement: str | None = None
    duration_days: int
    cost: float
    scheduled_start: date
    scheduled_end: date
    actual_start: date | None = None
    actual_end: date | None = None
    status: Literal["scheduled", "in_execution", "executed", "verified"]
    proofs_required: List[ProofRequirement] = Field(default_factory=list)
    metrics: dict[str, Any] = Field(default_factory=dict)
    proofs: List[AssetProof] = Field(default_factory=list)


class JBPAssetCreate(BaseModel):
    asset_catalog_id: str
    asset_name: str
    placement: str | None = None
    duration_days: int
    cost: float
    scheduled_start: date
    scheduled_end: date


class JBPContract(BaseModel):
    id: str
    supplier_id: str
    title: str
    status: Literal["draft", "active", "completed", "cancelled"]
    selected_assets: List[JBPAsset] = Field(default_factory=list)
    total_investment: float
    start_date: date
    end_date: date
    proof_status: str
    completion_percentage: float


class JBPContractCreate(BaseModel):
    supplier_id: str
    title: str
    status: Literal["draft", "active", "completed", "cancelled"] = "draft"
    total_investment: float
    start_date: date
    end_date: date
    assets: List[JBPAssetCreate]


class ContractListResponse(BaseModel):
    items: List[JBPContract]
    total: int


class ProofDashboardAsset(BaseModel):
    asset_id: str
    asset_name: str
    status: str
    scheduled_period: str
    proof_types: List[dict[str, Any]]
    metrics: dict[str, Any]


class ProofDashboardResponse(BaseModel):
    contract_id: str
    supplier_name: str
    period: str
    executive_summary: dict[str, Any]
    assets_status: List[ProofDashboardAsset]
    proof_center: ProofStatus


class ProofHistoryEntry(BaseModel):
    contract_id: str
    asset_name: str
    proof_type: ProofType
    url: str
    uploaded_at: datetime
    status: str


class ProofHistoryResponse(BaseModel):
    entries: List[ProofHistoryEntry]


class SupplierPortalExecutiveSummary(BaseModel):
    active_investment: str
    total_return: str
    current_roi: str
    contract_status: str


class FinancialPerformance(BaseModel):
    roi_evolution: List[float]
    sales_trend: dict[str, Any]
    market_share: dict[str, Any]


class ExecutionProofSummary(BaseModel):
    assets_contracted: int
    assets_executed: int
    assets_verified: int
    proof_status: List[dict[str, Any]]


class ActionableInsight(BaseModel):
    type: str
    title: str
    reason: str
    expected_impact: str
    confidence: float
    action: str


class SupplierPortalResponse(BaseModel):
    executive_summary: SupplierPortalExecutiveSummary
    financial_performance: FinancialPerformance
    execution_proof: ExecutionProofSummary
    actionable_insights: List[ActionableInsight]
    competitive_report: dict[str, Any] | None = None


class WeeklyEmailReport(BaseModel):
    subject: str
    greeting: str
    financial_highlights: dict[str, Any]
    proof_updates: List[str]
    featured_recommendation: str
    cta_links: List[dict[str, str]]


class SupplierAlert(BaseModel):
    type: str
    title: str
    message: str
    priority: Literal["low", "medium", "high"]
    action: str
