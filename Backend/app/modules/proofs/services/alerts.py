"""Supplier alert generation service."""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.proofs import repository, schemas


class SupplierAlertService:
    async def generate_alerts(
        self,
        session: AsyncSession,
        supplier_id: str,
        *,
        tenant_id: str,
    ) -> list[schemas.SupplierAlert]:
        alerts: list[schemas.SupplierAlert] = []

        if await self._is_roi_dropping(session, supplier_id, tenant_id=tenant_id):
            alerts.append(
                schemas.SupplierAlert(
                    type="warning",
                    title="Queda no ROI detectada",
                    message="ROI caiu de 28% para 22% na última semana. Vamos revisar?",
                    priority="high",
                    action="review_strategy",
                )
            )

        missing = await repository.get_overdue_assets(session, tenant_id=tenant_id, supplier_id=supplier_id)
        if missing:
            alerts.append(
                schemas.SupplierAlert(
                    type="alert",
                    title="Comprovações pendentes",
                    message=f"{len(missing)} ativos aguardando comprovação",
                    priority="medium",
                    action="upload_proofs",
                )
            )

        if await self._has_high_roi_opportunity(session, supplier_id, tenant_id=tenant_id):
            alerts.append(
                schemas.SupplierAlert(
                    type="opportunity",
                    title="Oportunidade de investimento",
                    message="ROI atual de 28% acima do esperado. Espaço para aumentar verba.",
                    priority="high",
                    action="increase_investment",
                )
            )

        return alerts

    async def _is_roi_dropping(self, session: AsyncSession, supplier_id: str, *, tenant_id: str) -> bool:
        stmt = text(
            """
            SELECT basic_roi ->> 'roi_percentage' AS roi
            FROM trade_roi_calculations
            WHERE supplier_id = :supplier_id AND tenant_id = :tenant_id
            ORDER BY created_at DESC
            LIMIT 2
            """
        )
        rows = (
            await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
        ).mappings().all()
        if len(rows) < 2:
            return False
        current = float(rows[0]["roi"] or 0)
        previous = float(rows[1]["roi"] or 0)
        return previous > 0 and current < previous

    async def _has_high_roi_opportunity(self, session: AsyncSession, supplier_id: str, *, tenant_id: str) -> bool:
        stmt = text(
            """
            SELECT AVG((basic_roi ->> 'roi_percentage')::NUMERIC) AS avg_roi
            FROM trade_roi_calculations
            WHERE supplier_id = :supplier_id AND tenant_id = :tenant_id
            """
        )
        row = (await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})).mappings().first()
        return bool(row and (row["avg_roi"] or 0) > 25)
