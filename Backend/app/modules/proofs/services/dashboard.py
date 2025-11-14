"""Proof dashboard aggregation service."""
from __future__ import annotations

from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.proofs import repository, schemas


class ProofDashboardService:
    async def generate_dashboard(
        self,
        session: AsyncSession,
        contract_id: str,
        *,
        tenant_id: str,
        supplier_name: str,
    ) -> schemas.ProofDashboardResponse:
        contract = await repository.get_contract(session, contract_id, tenant_id=tenant_id)
        if not contract:
            raise ValueError("Contract not found")
        assets = contract.selected_assets

        executed = len([a for a in assets if a.status in {"executed", "verified"}])
        verified = len([a for a in assets if a.status == "verified"])
        summary = {
            "total_investment": contract.total_investment,
            "assets_contracted": len(assets),
            "assets_executed": executed,
            "assets_verified": verified,
            "completion_percentage": round((verified / len(assets) * 100) if assets else 0, 2),
        }

        assets_status: List[schemas.ProofDashboardAsset] = []
        for asset in assets:
            proof_types = [
                {
                    "type": proof.proof_type,
                    "status": "approved" if proof.verified else "submitted",
                    "date": proof.uploaded_at.date().strftime("%d/%b"),
                }
                for proof in asset.proofs
            ]
            assets_status.append(
                schemas.ProofDashboardAsset(
                    asset_id=asset.id,
                    asset_name=asset.asset_name,
                    status=asset.status,
                    scheduled_period=f"{asset.scheduled_start:%d/%b}-{asset.scheduled_end:%d/%b}",
                    proof_types=proof_types,
                    metrics=asset.metrics,
                )
            )

        proof_center = schemas.ProofStatus(
            pending_approvals=len([p for p in assets_status if p.status == "executed"]),
            missing_proofs=len([p for p in assets_status if not p.proof_types]),
            next_deadlines=[
                f"{asset.scheduled_end:%d/%b} - {asset.asset_name}"
                for asset in assets
                if asset.status in {"scheduled", "in_execution"}
            ][:3],
        )

        return schemas.ProofDashboardResponse(
            contract_id=contract.id,
            supplier_name=supplier_name,
            period=f"{contract.start_date:%d/%b}-{contract.end_date:%d/%b}",
            executive_summary=summary,
            assets_status=assets_status,
            proof_center=proof_center,
        )
