"""High-level supplier portal service facade."""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.proofs.services.portal import SupplierPortalService as ProofSupplierPortalService
from app.modules.proofs.services.alerts import SupplierAlertService
from app.modules.proofs import schemas as proof_schemas
from app.modules.supplier_portal import schemas as supplier_portal_schemas


class SupplierPortalFacade:
    """Aggregates data from proof/data modules into the supplier dashboard contract."""

    def __init__(self) -> None:
        self.proof_portal = ProofSupplierPortalService()
        self.alert_service = SupplierAlertService()

    async def get_dashboard(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
    ) -> supplier_portal_schemas.SupplierDashboard:
        portal = await self.proof_portal.build_portal_view(session, supplier_id, tenant_id=tenant_id)
        alerts = await self.alert_service.generate_alerts(session, supplier_id, tenant_id=tenant_id)
        return supplier_portal_schemas.SupplierDashboard(
            executive_summary={
                "active_contracts": portal.execution_proof.assets_contracted,
                "total_investment": float(portal.executive_summary.active_investment.replace("R$", "").replace(".", "")),
                "current_roi": float(portal.executive_summary.current_roi.replace("%", "")),
                "total_sales": float(portal.executive_summary.total_return.replace("R$", "").replace(".", "")),
                "completion_rate": portal.execution_proof.assets_verified / max(
                    portal.execution_proof.assets_contracted or 1, 1
                )
                * 100,
            },
            financial_performance=portal.financial_performance.model_dump(),
            execution_tracking={
                "contracted_assets": portal.execution_proof.assets_contracted,
                "executed_assets": portal.execution_proof.assets_executed,
                "verified_assets": portal.execution_proof.assets_verified,
                "pending_actions": portal.execution_proof.proof_status,
            },
            recent_insights=[
                supplier_portal_schemas.Insight(
                    id=insight.id,
                    title=insight.title,
                    message=insight.reason,
                    type=insight.type,
                    priority="high",
                    action=insight.action,
                )
                for insight in portal.actionable_insights
            ],
            alerts=[
                supplier_portal_schemas.Alert(
                    id=alert.type,
                    title=alert.title,
                    message=alert.message,
                    type=alert.type,
                    priority=alert.priority,
                    action_url=None,
                    created_at=date.today(),
                )
                for alert in alerts
            ],
            recent_reports=[],
        )

    async def generate_weekly_report(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
    ) -> proof_schemas.WeeklyEmailReport:
        portal = await self.proof_portal.build_portal_view(session, supplier_id, tenant_id=tenant_id)
        supplier_name = "Fornecedor"
        return self.proof_portal.build_weekly_email(portal, supplier_name)
