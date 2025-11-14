"""Supplier vs market comparison service."""
from __future__ import annotations

from typing import Any, Mapping

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data.schemas import SalesComparisonResponse, SalesComparisonPosition


class SalesComparisonService:
    async def get_supplier_vs_market(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
    ) -> SalesComparisonResponse:
        supplier_performance = await self._get_supplier_performance(session, supplier_id, tenant_id)
        market_average = await self._get_market_average(session, supplier_performance.get("category"), tenant_id)
        competitors = await self._get_competitors(session, supplier_id, supplier_performance.get("category"), tenant_id)

        positioning = self._calculate_positioning(supplier_performance, market_average, competitors)

        return SalesComparisonResponse(
            supplier_performance=supplier_performance,
            market_average=market_average,
            top_competitors=competitors,
            positioning=positioning,
        )

    async def _get_supplier_performance(
        self,
        session: AsyncSession,
        supplier_id: str,
        tenant_id: str,
    ) -> dict[str, Any]:
        stmt = text(
            """
            SELECT s.name, s.category,
                   COALESCE(SUM(ss.sales_amount), 0) AS total_sales,
                   AVG(ss.growth_percentage) AS growth,
                   AVG(ss.market_share) AS market_share
            FROM trade_suppliers s
            LEFT JOIN trade_supplier_sales ss ON ss.supplier_id = s.id
            WHERE s.id = :supplier_id AND s.tenant_id = :tenant_id
            GROUP BY s.name, s.category
            """
        )
        result = await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
        row = result.mappings().first()
        if not row:
            return {"name": "Fornecedor", "category": "geral", "total_sales": 0, "growth": 0, "market_share": 0}
        return dict(row)

    async def _get_market_average(
        self,
        session: AsyncSession,
        category: str | None,
        tenant_id: str,
    ) -> dict[str, Any]:
        stmt = text(
            """
            SELECT
                :category AS category,
                AVG(ss.growth_percentage) AS avg_growth,
                AVG(ss.market_share) AS avg_market_share,
                AVG(ss.sales_amount) AS avg_sales
            FROM trade_suppliers s
            LEFT JOIN trade_supplier_sales ss ON ss.supplier_id = s.id
            WHERE s.category = :category OR :category IS NULL
              AND s.tenant_id = :tenant_id
            """
        )
        result = await session.execute(stmt, {"category": category, "tenant_id": tenant_id})
        row = result.mappings().first()
        return dict(row or {})

    async def _get_competitors(
        self,
        session: AsyncSession,
        supplier_id: str,
        category: str | None,
        tenant_id: str,
    ) -> list[dict[str, Any]]:
        stmt = text(
            """
            SELECT s.id, s.name, COALESCE(SUM(ss.sales_amount),0) AS total_sales,
                   AVG(ss.growth_percentage) AS growth,
                   AVG(ss.market_share) AS market_share
            FROM trade_suppliers s
            LEFT JOIN trade_supplier_sales ss ON ss.supplier_id = s.id
            WHERE s.tenant_id = :tenant_id
              AND s.id <> :supplier_id
              AND (s.category = :category OR :category IS NULL)
            GROUP BY s.id, s.name
            ORDER BY total_sales DESC
            LIMIT 5
            """
        )
        result = await session.execute(
            stmt,
            {"tenant_id": tenant_id, "supplier_id": supplier_id, "category": category},
        )
        return [dict(row) for row in result.mappings().all()]

    def _calculate_positioning(
        self,
        supplier: Mapping[str, Any],
        market: Mapping[str, Any],
        competitors: list[Mapping[str, Any]],
    ) -> SalesComparisonPosition:
        supplier_share = supplier.get("market_share") or 0
        supplier_growth = supplier.get("growth") or 0
        competitor_shares = [comp.get("market_share") or 0 for comp in competitors]
        competitor_growths = [comp.get("growth") or 0 for comp in competitors]

        share_rank = self._calculate_rank(supplier_share, competitor_shares)
        growth_rank = self._calculate_rank(supplier_growth, competitor_growths)

        overall = "lider" if share_rank <= 2 else "competitivo" if share_rank <= 4 else "em desenvolvimento"

        strengths = []
        opportunities = []
        if supplier_share > (market.get("avg_market_share") or 0):
            strengths.append("Acima da media em market share")
        else:
            opportunities.append("Espaco para ganhar share na categoria")

        if supplier_growth > (market.get("avg_growth") or 0):
            strengths.append("Crescendo mais rapido que o mercado")
        else:
            opportunities.append("Rever estrategia para acelerar crescimento")

        return SalesComparisonPosition(
            market_share_ranking=share_rank,
            growth_ranking=growth_rank,
            overall_position=overall,
            strengths=strengths,
            opportunities=opportunities,
        )

    def _calculate_rank(self, supplier_value: float, competitor_values: list[float]) -> int:
        sorted_values = sorted(competitor_values + [supplier_value], reverse=True)
        rank = sorted_values.index(supplier_value) + 1
        return rank
