"""Pydantic schemas for data insights and reporting."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, List, Literal

from pydantic import BaseModel, Field

from app.modules.trade.schemas import Supplier


class SalesTrendPoint(BaseModel):
    label: str
    sales_amount: float
    investment_value: float | None = None


class JBPPerformanceBlock(BaseModel):
    active_jbp: int
    total_investment: float
    average_roi: float | None = None
    goal_achievement: float | None = None


class ProductPerformance(BaseModel):
    id: str | None = None
    name: str
    sales_amount: float | None = None
    growth_percentage: float | None = None
    investment_level: Literal["low", "medium", "high"] | None = None
    rotation_speed: str | None = None
    growth_potential: float | None = None


class ProductAnalysisBlock(BaseModel):
    top_performers: List[ProductPerformance] = Field(default_factory=list)
    low_performers: List[ProductPerformance] = Field(default_factory=list)
    opportunities: List[ProductPerformance] = Field(default_factory=list)


class ReportSummary(BaseModel):
    supplier_name: str
    period: str
    total_sales: float
    growth_percentage: float | None = None
    market_share: float | None = None


class SupplierReport(BaseModel):
    supplier: Supplier
    summary: ReportSummary
    trend: List[SalesTrendPoint]
    jbp_performance: JBPPerformanceBlock
    product_analysis: ProductAnalysisBlock
    insights: List["Insight"] = Field(default_factory=list)
    comparison: dict[str, Any] | None = None
    roi_snapshot: dict[str, Any] | None = None


class Insight(BaseModel):
    id: str
    type: Literal["opportunity", "alert", "strategic", "information"]
    title: str
    message: str
    action: str | None = None
    priority: Literal["critical", "high", "medium", "low"] = "medium"
    confidence: float | None = None
    data_points: List[str] = Field(default_factory=list)
    expected_impact: Literal["high", "medium", "low"] = "medium"
    timeline: Literal["immediate", "next_30_days", "next_90_days"] = "next_30_days"
    score: float | None = None
    created_at: datetime | None = None


class SalesImportSummary(BaseModel):
    rows_imported: int
    suppliers_upserted: int
    products_upserted: int


class ImportSalesResponse(BaseModel):
    status: str = "completed"
    summary: SalesImportSummary
    sample_rows: List[dict[str, Any]] = Field(default_factory=list)


class ROIComputation(BaseModel):
    basic_roi: dict[str, float | None]
    incremental_roi: dict[str, float | None]
    causality_confidence: dict[str, float | None]
    future_projection: dict[str, float | None]
    recommendations: List[str]
    calculated_at: datetime


class SalesComparisonPosition(BaseModel):
    market_share_ranking: int | None = None
    growth_ranking: int | None = None
    overall_position: str | None = None
    strengths: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)


class SalesComparisonResponse(BaseModel):
    supplier_performance: dict[str, Any]
    market_average: dict[str, Any]
    top_competitors: List[dict[str, Any]]
    positioning: SalesComparisonPosition
