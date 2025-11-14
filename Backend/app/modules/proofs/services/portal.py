"""Supplier portal aggregation service."""
from __future__ import annotations

from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data.services.comparison import SalesComparisonService
from app.modules.data.services.insights import InsightEngineService, InsightPrioritizationService
from app.modules.data.services.performance import SupplierPerformanceService
from app.modules.data.services.roi_calculation import ROICalculationService
from app.modules.proofs import repository, schemas
from app.modules.proofs.services.dashboard import ProofDashboardService


class SupplierPortalService:
    def __init__(self) -> None:
        self.performance_service = SupplierPerformanceService(
            roi_service=ROICalculationService(),
            insight_engine=InsightEngineService(),
            prioritization_service=InsightPrioritizationService(),
            comparison_service=SalesComparisonService(),
        )
        self.dashboard_service = ProofDashboardService()

    async def build_portal_view(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
    ) -> schemas.SupplierPortalResponse:
        report = await self.performance_service.generate_supplier_report(
            session,
            supplier_id,
            tenant_id=tenant_id,
        )

        contracts = await repository.list_contracts(session, tenant_id=tenant_id, supplier_id=supplier_id)
        top_contract = contracts[0] if contracts else None
        execution = await self._build_execution_block(session, top_contract, tenant_id=tenant_id)

        insights = self._build_insights(report)
        competitive = report.comparison.model_dump() if report.comparison else None

        executive_summary = schemas.SupplierPortalExecutiveSummary(
            active_investment=f"R$ {report.jbp_performance.total_investment:,.0f}".replace(",", "."),
            total_return=f"R$ {report.summary.total_sales:,.0f}".replace(",", "."),
            current_roi=f"{report.jbp_performance.average_roi or 0:.0f}%",
            contract_status=(
                f"Em execucao ({execution.assets_verified}/{execution.assets_contracted})"
                if execution.assets_contracted
                else "Sem contratos"
            ),
        )

        financial = schemas.FinancialPerformance(
            roi_evolution=[report.jbp_performance.average_roi or 0 for _ in range(5)],
            sales_trend={
                "current": report.summary.total_sales,
                "previous": (report.summary.total_sales / 1.18) if report.summary.total_sales else 0,
                "growth": report.summary.growth_percentage or 0,
            },
            market_share={
                "current": report.summary.market_share or 0,
                "trend": "up" if (report.summary.market_share or 0) >= 0 else "neutral",
            },
        )

        return schemas.SupplierPortalResponse(
            executive_summary=executive_summary,
            financial_performance=financial,
            execution_proof=execution,
            actionable_insights=insights,
            competitive_report=competitive,
        )

    async def _build_execution_block(
        self,
        session: AsyncSession,
        contract: schemas.JBPContract | None,
        *,
        tenant_id: str,
    ) -> schemas.ExecutionProofSummary:
        if not contract:
            return schemas.ExecutionProofSummary(
                assets_contracted=0,
                assets_executed=0,
                assets_verified=0,
                proof_status=[],
            )
        dashboard = await self.dashboard_service.generate_dashboard(
            session,
            contract.id,
            tenant_id=tenant_id,
            supplier_name=contract.title,
        )
        proof_status = [
            {"asset": item.asset_name, "status": item.status, "proofs": len(item.proof_types)}
            for item in dashboard.assets_status
        ]
        return schemas.ExecutionProofSummary(
            assets_contracted=len(dashboard.assets_status),
            assets_executed=len([a for a in dashboard.assets_status if a.status in {"executed", "verified"}]),
            assets_verified=len([a for a in dashboard.assets_status if a.status == "verified"]),
            proof_status=proof_status,
        )

    def _build_insights(self, report) -> List[schemas.ActionableInsight]:
        ranked = report.insights or []
        actions: List[schemas.ActionableInsight] = []
        for insight in ranked:
            actions.append(
                schemas.ActionableInsight(
                    type=insight.type,
                    title=insight.title,
                    reason=insight.message,
                    expected_impact=f"Impacto {getattr(insight, 'expected_impact', 'medio')}",
                    confidence=insight.confidence or 0.7,
                    action=insight.action or "",
                )
            )
        if not actions:
            actions.append(
                schemas.ActionableInsight(
                    type="information",
                    title="Sem recomendacoes imediatas",
                    reason="Continue acompanhando as metricas semanais.",
                    expected_impact="Estabilidade",
                    confidence=0.5,
                    action="monitor",
                )
            )
        return actions

    def build_weekly_email(self, portal: schemas.SupplierPortalResponse, supplier_name: str) -> schemas.WeeklyEmailReport:
        summary = portal.executive_summary
        proof_lines = [
            f"- {item['asset']} - {item['status']} ({item['proofs']} comprovacoes)"
            for item in portal.execution_proof.proof_status
        ]
        featured = portal.actionable_insights[0].reason if portal.actionable_insights else "Sem recomendacoes para a semana."
        return schemas.WeeklyEmailReport(
            subject=f"Seu ROI da semana: {summary.current_roi} | {supplier_name}",
            greeting=f"Ola {supplier_name},",
            financial_highlights={
                "vendas_totais": summary.total_return,
                "roi": summary.current_roi,
                "market_share": f"{portal.financial_performance.market_share['current']}%",
            },
            proof_updates=proof_lines,
            featured_recommendation=featured,
            cta_links=[
                {"label": "Ver relatorio completo", "url": "#"},
                {"label": "Agendar reuniao", "url": "#"},
            ],
        )
