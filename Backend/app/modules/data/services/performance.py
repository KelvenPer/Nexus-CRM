"""Supplier performance aggregation service."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data.schemas import (
    Insight,
    JBPPerformanceBlock,
    ProductAnalysisBlock,
    ProductPerformance,
    ReportSummary,
    SalesTrendPoint,
    SupplierReport,
)
from app.modules.data.services.comparison import SalesComparisonService
from app.modules.data.services.insights import InsightEngineService, InsightPrioritizationService
from app.modules.data.services.roi_calculation import ROICalculationService
from app.modules.trade.repository import get_supplier
from app.modules.trade.schemas import ROIProjection, Supplier


def _decimal(value: Any) -> float:
    return float(value or 0)


class SupplierPerformanceService:
    def __init__(
        self,
        roi_service: ROICalculationService,
        insight_engine: InsightEngineService,
        prioritization_service: InsightPrioritizationService,
        comparison_service: SalesComparisonService,
    ) -> None:
        self.roi_service = roi_service
        self.insight_engine = insight_engine
        self.prioritization_service = prioritization_service
        self.comparison_service = comparison_service

    async def generate_supplier_report(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
        period_label: str = "current_week",
    ) -> SupplierReport:
        supplier = await get_supplier(session, supplier_id, tenant_id=tenant_id)
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor nao encontrado.")

        sales_rows = await self._get_sales_rows(session, supplier_id, tenant_id)
        if not sales_rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum dado de vendas encontrado.")

        summary = self._build_summary(supplier, sales_rows, period_label)
        trend = self._build_trend(sales_rows)
        jbp_block = await self._build_jbp_block(session, supplier_id, tenant_id)
        product_block = await self._build_product_block(session, supplier_id, tenant_id)
        roi_snapshot = await self._get_roi_snapshot(session, supplier_id, tenant_id)

        insight_context = {
            "roi": (roi_snapshot.basic_roi or {}).get("roi_percentage", 0) if roi_snapshot else 0,
            "incremental_roi": (roi_snapshot.incremental_roi or {}).get("incremental_roi", 0) if roi_snapshot else 0,
            "product_growth": product_block.top_performers[0].growth_percentage if product_block.top_performers else 0,
            "investment_level": product_block.top_performers[0].investment_level if product_block.top_performers else "medium",
            "market_share": summary.market_share,
            "growth_percentage": summary.growth_percentage,
        }
        insights_raw = await self.insight_engine.generate_supplier_insights(
            session, supplier.id, tenant_id=tenant_id, context=insight_context
        )
        ranked_insights = self.prioritization_service.rank_insights(insights_raw)

        comparison = await self.comparison_service.get_supplier_vs_market(session, supplier.id, tenant_id=tenant_id)
        await session.commit()

        return SupplierReport(
            supplier=supplier,
            summary=summary,
            trend=trend,
            jbp_performance=jbp_block,
            product_analysis=product_block,
            insights=ranked_insights,
            comparison=comparison,
            roi_snapshot=roi_snapshot.model_dump() if roi_snapshot else None,
        )

    async def _get_sales_rows(
        self,
        session: AsyncSession,
        supplier_id: str,
        tenant_id: str,
    ) -> list[Mapping[str, Any]]:
        stmt = text(
            """
            SELECT *
            FROM trade_supplier_sales
            WHERE supplier_id = :supplier_id AND tenant_id = :tenant_id
            ORDER BY period_date DESC
            LIMIT 12
            """
        )
        result = await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
        return result.mappings().all()

    def _build_summary(
        self,
        supplier: Supplier,
        sales_rows: list[Mapping[str, Any]],
        period_label: str,
    ) -> ReportSummary:
        current = sales_rows[0]
        previous = sales_rows[1] if len(sales_rows) > 1 else None
        total_sales = _decimal(current["sales_amount"])
        growth_percentage = (
            _decimal(current["growth_percentage"]) if current.get("growth_percentage") is not None else None
        )
        if growth_percentage is None and previous:
            prev_amount = _decimal(previous["sales_amount"])
            growth_percentage = ((total_sales - prev_amount) / prev_amount * 100) if prev_amount else None
        market_share = current.get("market_share")
        return ReportSummary(
            supplier_name=supplier.name,
            period=period_label,
            total_sales=total_sales,
            growth_percentage=round(growth_percentage, 2) if growth_percentage is not None else None,
            market_share=round(market_share, 2) if market_share is not None else None,
        )

    def _build_trend(self, sales_rows: list[Mapping[str, Any]]) -> list[SalesTrendPoint]:
        points: list[SalesTrendPoint] = []
        for row in reversed(sales_rows[:6]):
            label = f"Semana {row['week']}/{row['year']}"
            points.append(
                SalesTrendPoint(
                    label=label,
                    sales_amount=_decimal(row["sales_amount"]),
                    investment_value=_decimal(row.get("department_sales_amount")),
                )
            )
        return points

    async def _build_jbp_block(
        self,
        session: AsyncSession,
        supplier_id: str,
        tenant_id: str,
    ) -> JBPPerformanceBlock:
        stmt = text(
            """
            SELECT
                COUNT(*) FILTER (WHERE status IN ('approved','active')) AS active_jbp,
                COALESCE(SUM(investment_value),0) AS total_investment,
                AVG(expected_roi) AS average_roi,
                AVG(goal_achievement) AS goal_achievement
            FROM trade_jbp_plans
            WHERE supplier_id = :supplier_id
              AND tenant_id = :tenant_id
            """
        )
        result = await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
        row = result.mappings().first()
        return JBPPerformanceBlock(
            active_jbp=int(row["active_jbp"] or 0),
            total_investment=float(row["total_investment"] or 0),
            average_roi=float(row["average_roi"]) if row["average_roi"] is not None else None,
            goal_achievement=float(row["goal_achievement"]) if row["goal_achievement"] is not None else None,
        )

    async def _build_product_block(
        self,
        session: AsyncSession,
        supplier_id: str,
        tenant_id: str,
    ) -> ProductAnalysisBlock:
        stmt = text(
            """
            WITH product_sales AS (
                SELECT
                    sp.id,
                    sp.product_name,
                    sp.rotation_speed,
                    sp.sell_through_rate,
                    ps.sales_amount,
                    ps.sales_quantity,
                    ps.profit_margin
                FROM trade_supplier_products sp
                LEFT JOIN trade_product_sales ps ON ps.product_id = sp.id
                WHERE sp.supplier_id = :supplier_id
                  AND sp.tenant_id = :tenant_id
            )
            SELECT * FROM product_sales
            """
        )
        result = await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
        products = result.mappings().all()

        top = sorted(products, key=lambda row: _decimal(row["sales_amount"]), reverse=True)[:3]
        low = sorted(products, key=lambda row: _decimal(row["sales_amount"]))[:3]
        opportunities = [row for row in products if (row.get("sell_through_rate") or 0) > 40][:3]

        def _map(rows: list[Mapping[str, Any]]) -> list[ProductPerformance]:
            mapped: list[ProductPerformance] = []
            for row in rows:
                mapped.append(
                    ProductPerformance(
                        id=row.get("id"),
                        name=row.get("product_name", "Produto"),
                        sales_amount=_decimal(row.get("sales_amount")),
                        growth_percentage=row.get("profit_margin"),
                        investment_level="medium",
                        rotation_speed=row.get("rotation_speed"),
                        growth_potential=row.get("sell_through_rate"),
                    )
                )
            return mapped

        return ProductAnalysisBlock(
            top_performers=_map(top),
            low_performers=_map(low),
            opportunities=_map(opportunities),
        )

    async def _get_roi_snapshot(
        self,
        session: AsyncSession,
        supplier_id: str,
        tenant_id: str,
    ) -> ROIProjection | None:
        stmt = text(
            """
            SELECT basic_roi, incremental_roi, causality_confidence, calculation_data
            FROM trade_roi_calculations
            WHERE supplier_id = :supplier_id
              AND tenant_id = :tenant_id
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        result = await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
        row = result.mappings().first()
        if not row:
            return None
        row_data = dict(row)
        calc_data = row_data.get("calculation_data") or {}
        return ROIProjection(
            basic_roi=row_data.get("basic_roi"),
            incremental_roi=row_data.get("incremental_roi"),
            causality_confidence=row_data.get("causality_confidence"),
            future_projection=calc_data.get("projection"),
            recommendations=calc_data.get("recommendations", []),
        )
