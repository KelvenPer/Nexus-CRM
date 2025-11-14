"""Rule-based insight engine."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Callable, List
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data.schemas import Insight


InsightCondition = Callable[[dict[str, Any]], bool]


@dataclass
class InsightRule:
    id: str
    category: str
    condition: InsightCondition
    message: Callable[[dict[str, Any]], str]
    action: str
    priority: str
    confidence: float


class InsightEngineService:
    def __init__(self) -> None:
        self.insight_rules: list[InsightRule] = []
        self._initialize_rules()

    def _initialize_rules(self) -> None:
        self.insight_rules.append(
            InsightRule(
                id="high_roi_opportunity",
                category="investment_opportunity",
                condition=lambda data: (data.get("roi") or 0) > 25 and (data.get("incremental_roi") or 0) > 10,
                message=lambda data: f"ROI de {data.get('roi', 0):.1f}% acima do esperado. Avalie aumentar investimento.",
                action="increase_investment",
                priority="high",
                confidence=0.85,
            )
        )
        self.insight_rules.append(
            InsightRule(
                id="product_breakout",
                category="product_opportunity",
                condition=lambda data: (data.get("product_growth") or 0) > 40,
                message=lambda data: "Produto com crescimento acelerado e baixa pressao de investimento. Potencial imediato.",
                action="scale_product_investment",
                priority="medium",
                confidence=0.75,
            )
        )
        self.insight_rules.append(
            InsightRule(
                id="market_share_opportunity",
                category="strategic_opportunity",
                condition=lambda data: (data.get("growth_percentage") or 0) > 15 and (data.get("market_share") or 0) < 10,
                message=lambda data: "Crescimento acima do mercado com share reduzido. Hora de escalar distribuicao.",
                action="aggressive_growth",
                priority="high",
                confidence=0.8,
            )
        )
        self.insight_rules.append(
            InsightRule(
                id="underperforming_investment",
                category="risk_alert",
                condition=lambda data: (data.get("roi") or 0) < 5,
                message=lambda data: "ROI abaixo de 5%. Revisao urgente do plano e contrapartidas.",
                action="review_strategy",
                priority="critical",
                confidence=0.9,
            )
        )

    async def generate_supplier_insights(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
        context: dict[str, Any],
    ) -> list[Insight]:
        generated: list[Insight] = []
        for rule in self.insight_rules:
            if rule.condition(context):
                insight = Insight(
                    id=f"{rule.id}_{uuid4().hex}",
                    type=self._resolve_type(rule.category),
                    title=self._build_title(rule.category),
                    message=rule.message(context),
                    action=rule.action,
                    priority=rule.priority,
                    confidence=rule.confidence,
                    data_points=self._build_data_points(context),
                    expected_impact=self._expected_impact(rule.action),
                    timeline="next_30_days",
                )
                generated.append(insight)

        await self._persist_insights(session, supplier_id, tenant_id, generated)
        return generated

    async def _persist_insights(
        self,
        session: AsyncSession,
        supplier_id: str,
        tenant_id: str,
        insights: list[Insight],
    ) -> None:
        if not insights:
            return
        stmt = text(
            """
            INSERT INTO trade_supplier_insights (
                id, tenant_id, supplier_id, insight_type, title, message,
                action, priority, confidence, data_points, expected_impact,
                timeline, created_at, expires_at
            )
            VALUES (
                :id, :tenant_id, :supplier_id, :insight_type, :title, :message,
                :action, :priority, :confidence, :data_points::jsonb, :expected_impact,
                :timeline, :created_at, :expires_at
            )
            """
        )
        for insight in insights:
            await session.execute(
                stmt,
                {
                    "id": insight.id,
                    "tenant_id": tenant_id,
                    "supplier_id": supplier_id,
                    "insight_type": insight.type,
                    "title": insight.title,
                    "message": insight.message,
                    "action": insight.action,
                    "priority": insight.priority,
                    "confidence": insight.confidence,
                    "data_points": json_dumps(insight.data_points),
                    "expected_impact": insight.expected_impact,
                    "timeline": insight.timeline,
                    "created_at": datetime.utcnow(),
                    "expires_at": datetime.utcnow() + timedelta(days=30),
                },
            )

    def _resolve_type(self, category: str) -> str:
        mapping = {
            "investment_opportunity": "opportunity",
            "product_opportunity": "opportunity",
            "strategic_opportunity": "strategic",
            "risk_alert": "alert",
        }
        return mapping.get(category, "information")

    def _build_title(self, category: str) -> str:
        titles = {
            "investment_opportunity": "Oportunidade de investimento",
            "product_opportunity": "Produto em destaque",
            "strategic_opportunity": "Oportunidade estrategica",
            "risk_alert": "Alerta de performance",
        }
        return titles.get(category, "Insight gerado")

    def _build_data_points(self, context: dict[str, Any]) -> list[str]:
        return [
            f"ROI: {context.get('roi', 0):.1f}%",
            f"Market share: {context.get('market_share', 0) or 0:.1f}%",
            f"Crescimento: {context.get('growth_percentage', 0) or 0:.1f}%",
        ]

    def _expected_impact(self, action: str) -> str:
        mapping = {
            "increase_investment": "high",
            "scale_product_investment": "medium",
            "aggressive_growth": "high",
            "review_strategy": "critical",
        }
        return mapping.get(action, "medium")


class InsightPrioritizationService:
    def rank_insights(self, insights: list[Insight]) -> list[Insight]:
        ranked: list[Insight] = []
        for insight in insights:
            score = self._calculate_score(insight)
            ranked.append(Insight(**{**insight.model_dump(), "score": score}))
        return sorted(ranked, key=lambda data: data.score or 0, reverse=True)[:5]

    def _calculate_score(self, insight: Insight) -> float:
        weights = {
            "critical": 1.0,
            "high": 0.8,
            "medium": 0.5,
            "low": 0.3,
        }
        priority_weight = weights.get(insight.priority, 0.3)
        confidence = insight.confidence or 0.5
        impact_weight = {"high": 1.0, "medium": 0.7, "low": 0.4}.get(insight.expected_impact, 0.5)
        urgency_weight = {"immediate": 1.0, "next_30_days": 0.8, "next_90_days": 0.5}.get(insight.timeline, 0.6)
        return round(priority_weight * confidence * impact_weight * urgency_weight, 3)


def json_dumps(payload: list[str]) -> str:
    import json

    return json.dumps(payload)
