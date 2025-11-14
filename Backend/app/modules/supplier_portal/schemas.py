"""Schemas for the supplier portal module."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class PendingAction(BaseModel):
    title: str
    description: str
    deadline: datetime | None = None
    action_url: str | None = None


class MonthlyROI(BaseModel):
    month: str
    roi: float


class SalesTrend(BaseModel):
    current: float
    previous: float
    growth: float


class MarketShareData(BaseModel):
    current: float
    trend: Literal["up", "down", "flat"]


class Insight(BaseModel):
    id: str
    title: str
    message: str
    type: str
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    action: str | None = None


class Alert(BaseModel):
    id: str
    title: str
    message: str
    type: str
    priority: Literal["low", "medium", "high", "critical"]
    action_url: str | None = None
    created_at: datetime


class ReportSummary(BaseModel):
    id: str
    report_type: str
    status: str
    period_start: date
    period_end: date
    file_url: str | None = None


class SupplierDashboard(BaseModel):
    executive_summary: dict[str, float]
    financial_performance: dict
    execution_tracking: dict
    recent_insights: List[Insight]
    alerts: List[Alert]
    recent_reports: List[ReportSummary]


class WeeklyReport(BaseModel):
    period: dict[str, date]
    summary: dict
    financial_analysis: dict
    execution_analysis: dict
    competitive_analysis: dict
    recommendations: List[Insight]
