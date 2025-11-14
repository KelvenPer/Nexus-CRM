"""Pydantic schemas for the Trade module."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


BusinessSize = Literal["small", "medium", "large"]
JBPStatus = Literal["draft", "approved", "active", "completed", "cancelled"]


class SupplierBase(BaseModel):
    name: str
    cnpj: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    phone: str | None = None
    category: str | None = None
    business_size: BusinessSize | None = None
    priority_level: int | None = Field(default=None, ge=1, le=5)
    payment_terms: str | None = None
    strategic_importance: Literal["high", "medium", "low"] | None = None


class Supplier(SupplierBase):
    id: str
    tenant_id: str
    total_investment: float = 0.0
    total_sales: float = 0.0
    average_roi: float | None = None
    created_at: datetime
    updated_at: datetime


class SupplierWithPerformance(Supplier):
    current_week_sales: float | None = None
    growth_vs_previous: float | None = None
    jbp_status: Literal["active", "inactive", "pending"] = "inactive"
    top_products: List[dict[str, str]] = Field(default_factory=list)


class JBPBase(BaseModel):
    supplier_id: str = Field(..., description="Supplier responsible for the plan.")
    title: str
    description: str | None = None
    investment_value: float = Field(..., gt=0)
    investment_type: Literal["cash", "products", "marketing"] | None = None
    start_date: date
    end_date: date
    counter_parties: List[str] = Field(default_factory=list)
    exclusive_benefits: List[str] = Field(default_factory=list)
    sales_target: float | None = None
    growth_target: float | None = None
    expected_roi: float | None = None


class JBPCreationRequest(JBPBase):
    status: JBPStatus = "draft"


class JBPPlan(JBPBase):
    id: str
    status: JBPStatus
    approved_by: str | None = None
    approved_at: datetime | None = None
    actual_sales: float | None = None
    actual_roi: float | None = None
    goal_achievement: float | None = None
    created_at: datetime
    updated_at: datetime


class ROIProjection(BaseModel):
    basic_roi: dict[str, float | None] | None = None
    incremental_roi: dict[str, float | None] | None = None
    causality_confidence: dict[str, float | None] | None = None
    future_projection: dict[str, float | None] | None = None
    recommendations: List[str] = Field(default_factory=list)


class JBPDetailResponse(BaseModel):
    plan: JBPPlan
    supplier: Supplier
    roi: ROIProjection | None = None


class JBPListResponse(BaseModel):
    items: List[JBPPlan] = Field(default_factory=list)
    total: int = 0


class SalesImportResult(BaseModel):
    rows_imported: int
    suppliers_upserted: int
    products_upserted: int
