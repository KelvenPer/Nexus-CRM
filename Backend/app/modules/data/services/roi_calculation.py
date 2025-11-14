"""ROI calculation services."""
from __future__ import annotations

from datetime import date, datetime
from statistics import mean
from typing import Any, Mapping

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data.schemas import ROIComputation


def _decimal(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


class ROICalculationService:
    """Calculates ROI metrics for JBP plans."""

    async def calculate_jbp_roi(
        self,
        session: AsyncSession,
        jbp_plan_id: str,
        *,
        tenant_id: str,
        period: dict[str, date] | None = None,
    ) -> ROIComputation | None:
        plan = await self._get_plan(session, jbp_plan_id, tenant_id=tenant_id)
        if not plan:
            return None

        sales_data = await self._get_sales_data(session, plan, tenant_id=tenant_id, period=period)
        baseline = await self._get_baseline(session, plan["supplier_id"], plan["start_date"], tenant_id=tenant_id)

        basic_roi = await self._calculate_basic_roi(plan, sales_data)
        incremental_roi = await self._calculate_incremental_roi(plan, sales_data, baseline)
        causality = self._analyze_causality(plan, sales_data)
        projection = self._project_future(plan, sales_data)

        recommendations = self._build_recommendations(basic_roi, incremental_roi, causality)

        await self._persist_roi(
            session,
            plan,
            basic_roi,
            incremental_roi,
            causality,
            projection,
            tenant_id=tenant_id,
        )

        return ROIComputation(
            basic_roi=basic_roi,
            incremental_roi=incremental_roi,
            causality_confidence=causality,
            future_projection=projection,
            recommendations=recommendations,
            calculated_at=datetime.utcnow(),
        )

    async def _get_plan(self, session: AsyncSession, plan_id: str, *, tenant_id: str) -> Mapping[str, Any] | None:
        stmt = text("SELECT * FROM trade_jbp_plans WHERE id = :plan_id AND tenant_id = :tenant_id")
        result = await session.execute(stmt, {"plan_id": plan_id, "tenant_id": tenant_id})
        row = result.mappings().first()
        return row

    async def _get_sales_data(
        self,
        session: AsyncSession,
        plan: Mapping[str, Any],
        *,
        tenant_id: str,
        period: dict[str, date] | None = None,
    ) -> list[Mapping[str, Any]]:
        start_date = period["start"] if period else plan["start_date"]
        end_date = period["end"] if period else plan["end_date"]
        stmt = text(
            """
            SELECT *
            FROM trade_supplier_sales
            WHERE supplier_id = :supplier_id
              AND tenant_id = :tenant_id
              AND period_date BETWEEN :start AND :end
            ORDER BY period_date
            """
        )
        result = await session.execute(
            stmt,
            {
                "supplier_id": plan["supplier_id"],
                "tenant_id": tenant_id,
                "start": start_date,
                "end": end_date,
            },
        )
        return result.mappings().all()

    async def _get_baseline(
        self,
        session: AsyncSession,
        supplier_id: str,
        start_date: date,
        *,
        tenant_id: str,
    ) -> list[Mapping[str, Any]]:
        stmt = text(
            """
            SELECT *
            FROM trade_supplier_sales
            WHERE supplier_id = :supplier_id
              AND tenant_id = :tenant_id
              AND period_date < :start
            ORDER BY period_date DESC
            LIMIT 52
            """
        )
        result = await session.execute(
            stmt,
            {"supplier_id": supplier_id, "tenant_id": tenant_id, "start": start_date},
        )
        return result.mappings().all()

    async def _calculate_basic_roi(
        self,
        plan: Mapping[str, Any],
        sales_data: list[Mapping[str, Any]],
    ) -> dict[str, float | None]:
        investment = _decimal(plan["investment_value"]) or 0.0
        gross_return = sum(_decimal(row["sales_amount"]) or 0.0 for row in sales_data)
        net_return = gross_return * 0.25
        roi_percentage = ((net_return - investment) / investment * 100) if investment else None
        payback = investment / (net_return / 3) if net_return else None
        breakeven = investment - net_return
        return {
            "investment": investment,
            "gross_return": gross_return,
            "net_return": net_return,
            "roi_percentage": round(roi_percentage, 2) if roi_percentage is not None else None,
            "payback_months": round(payback, 1) if payback else None,
            "breakeven_point": round(breakeven, 2),
        }

    async def _calculate_incremental_roi(
        self,
        plan: Mapping[str, Any],
        sales_data: list[Mapping[str, Any]],
        baseline: list[Mapping[str, Any]],
    ) -> dict[str, float | None]:
        if not sales_data:
            return {
                "organic_growth_rate": None,
                "expected_organic_sales": None,
                "incremental_sales": None,
                "incremental_margin": None,
                "incremental_roi": None,
                "attribution_confidence": None,
            }

        avg_baseline = mean(_decimal(row["sales_amount"]) or 0.0 for row in baseline) if baseline else 0.0
        monthly_growth_rates = [(_decimal(row["growth_percentage"]) or 0.0) / 100 for row in baseline[:12]]
        organic_growth_rate = mean(monthly_growth_rates) if monthly_growth_rates else 0.0
        expected_organic_sales = avg_baseline * (1 + organic_growth_rate)
        current_sales_total = sum(_decimal(row["sales_amount"]) or 0.0 for row in sales_data)
        incremental_sales = current_sales_total - expected_organic_sales
        incremental_margin = incremental_sales * 0.25
        incremental_roi = (
            (incremental_margin / (_decimal(plan["investment_value"]) or 1)) * 100 if incremental_margin else None
        )
        return {
            "organic_growth_rate": round(organic_growth_rate * 100, 2),
            "expected_organic_sales": round(expected_organic_sales, 2),
            "incremental_sales": round(incremental_sales, 2),
            "incremental_margin": round(incremental_margin, 2),
            "incremental_roi": round(incremental_roi, 2) if incremental_roi else None,
            "attribution_confidence": self._calculate_attribution_confidence(sales_data, baseline),
        }

    def _analyze_causality(self, plan: Mapping[str, Any], sales_data: list[Mapping[str, Any]]) -> dict[str, float | None]:
        if not sales_data:
            return {"score": None, "interpretation": "insufficient_data"}
        growth = _decimal(sales_data[-1].get("growth_percentage")) or 0.0
        market_share = _decimal(sales_data[-1].get("market_share")) or 0.0
        timing_factor = 0.9 if growth > 0 else 0.3
        market_factor = 0.8 if market_share >= (_decimal(plan.get("expected_roi")) or 0) / 2 else 0.5
        score = round((timing_factor + market_factor) / 2, 2)
        level = "high" if score >= 0.75 else "medium" if score >= 0.5 else "low"
        return {"score": score, "interpretation": level}

    def _project_future(
        self,
        plan: Mapping[str, Any],
        sales_data: list[Mapping[str, Any]],
    ) -> dict[str, float | None]:
        total_sales = sum(_decimal(row["sales_amount"]) or 0.0 for row in sales_data)
        expected_roi = _decimal(plan.get("expected_roi")) or 0.0
        projection = total_sales * (1 + expected_roi / 100)
        return {
            "projected_sales": round(projection, 2),
            "confidence": 0.65 if sales_data else 0.2,
        }

    def _build_recommendations(
        self,
        basic_roi: dict[str, float | None],
        incremental_roi: dict[str, float | None],
        causality: dict[str, float | None],
    ) -> list[str]:
        recommendations: list[str] = []
        if (basic_roi.get("roi_percentage") or 0) > 25:
            recommendations.append("Investimento atual gera retorno acima da media. Considere expandir o plano.")
        if (incremental_roi.get("incremental_roi") or 0) < 5:
            recommendations.append("ROI incremental abaixo do esperado. Reavalie contrapartidas.")
        if (causality.get("score") or 0) < 0.5:
            recommendations.append("Evidencias de causalidade baixas. Ajuste a comunicacao do JBP.")
        return recommendations or ["Monitorar resultados semanalmente."]

    async def _persist_roi(
        self,
        session: AsyncSession,
        plan: Mapping[str, Any],
        basic_roi: dict[str, float | None],
        incremental_roi: dict[str, float | None],
        causality: dict[str, float | None],
        projection: dict[str, float | None],
        *,
        tenant_id: str,
    ) -> None:
        stmt = text(
            """
            INSERT INTO trade_roi_calculations (
                id, tenant_id, supplier_id, jbp_plan_id,
                period_start, period_end,
                basic_roi, incremental_roi, causality_confidence,
                calculation_data
            )
            VALUES (
                gen_random_uuid(), :tenant_id, :supplier_id, :plan_id,
                :start_date, :end_date,
                :basic_roi::jsonb, :incremental_roi::jsonb, :causality::jsonb,
                :calculation_data::jsonb
            )
            """
        )
        await session.execute(
            stmt,
            {
                "tenant_id": tenant_id,
                "supplier_id": plan["supplier_id"],
                "plan_id": plan["id"],
                "start_date": plan["start_date"],
                "end_date": plan["end_date"],
                "basic_roi": json_dumps(basic_roi),
                "incremental_roi": json_dumps(incremental_roi),
                "causality": json_dumps(causality),
                "calculation_data": json_dumps({"projection": projection}),
            },
        )

    def _calculate_attribution_confidence(
        self,
        sales_data: list[Mapping[str, Any]],
        baseline: list[Mapping[str, Any]],
    ) -> float:
        if not sales_data or not baseline:
            return 0.3
        current_growth = mean((_decimal(row["growth_percentage"]) or 0.0) for row in sales_data[:4])
        baseline_growth = mean((_decimal(row["growth_percentage"]) or 0.0) for row in baseline[:4])
        delta = current_growth - baseline_growth
        if delta > 20:
            return 0.9
        if delta > 10:
            return 0.7
        return 0.5


def json_dumps(payload: dict | list | None) -> str:
    import json

    return json.dumps(payload or {})
