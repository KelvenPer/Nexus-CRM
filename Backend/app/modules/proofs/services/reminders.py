"""Reminder scheduling and escalation for proof collection."""
from __future__ import annotations

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.proofs import repository


class ProofReminderService:
    async def schedule_proof_reminders(
        self,
        session: AsyncSession,
        contract_id: str,
        *,
        tenant_id: str,
    ) -> None:
        assets = await repository.get_assets_for_contract(session, contract_id, tenant_id=tenant_id)
        for asset in assets:
            start = asset["scheduled_start"]
            end = asset["scheduled_end"]
            await repository.schedule_notification(
                session,
                tenant_id=tenant_id,
                asset_id=str(asset["id"]),
                message=f"Execução próxima: {asset['asset_name']} inicia em 3 dias",
                send_at=start - timedelta(days=3),
            )
            await repository.schedule_notification(
                session,
                tenant_id=tenant_id,
                asset_id=str(asset["id"]),
                message=f"Execução iniciada: {asset['asset_name']} inicia hoje",
                send_at=start,
            )
            await repository.schedule_notification(
                session,
                tenant_id=tenant_id,
                asset_id=str(asset["id"]),
                message=f"Comprovação necessária: {asset['asset_name']} finaliza em 2 dias",
                send_at=end - timedelta(days=2),
            )

    async def check_missing_proofs(
        self,
        session: AsyncSession,
        *,
        tenant_id: str,
    ) -> list[dict[str, str]]:
        overdue = await repository.get_overdue_assets(session, tenant_id=tenant_id)
        escalations: list[dict[str, str]] = []
        for asset in overdue:
            days = asset["days_overdue"]
            severity = "normal"
            if days > 7:
                severity = "critical"
            elif days > 3:
                severity = "urgent"
            escalations.append(
                {
                    "asset_id": str(asset["id"]),
                    "asset_name": asset["asset_name"],
                    "severity": severity,
                    "message": f"{asset['asset_name']} sem prova há {days} dias",
                }
            )
        return escalations
