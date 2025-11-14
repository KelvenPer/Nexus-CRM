"""Automated proof integrations."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.proofs import repository


class AutomatedProofService:
    async def setup_automated_proofs(
        self,
        session: AsyncSession,
        asset_id: str,
        *,
        tenant_id: str,
        asset_catalog_id: str,
        placement_url: str | None = None,
    ) -> list[dict]:
        entries: list[dict] = []
        if asset_catalog_id == "banner_ecommerce":
            entries.append(
                await self._create_entry(
                    session,
                    asset_id,
                    tenant_id=tenant_id,
                    source="google_analytics",
                    metric="impressions",
                    target_value=100000,
                    value=None,
                    capture_schedule="daily",
                    metadata={"notes": "Meta baseada no histórico do e-commerce"},
                )
            )
            entries.append(
                await self._create_entry(
                    session,
                    asset_id,
                    tenant_id=tenant_id,
                    source="ecommerce_platform",
                    metric="screenshot",
                    target_value=None,
                    value=None,
                    capture_schedule="on_publish",
                    metadata={"capture_url": placement_url},
                )
            )
        elif asset_catalog_id == "featured_app":
            entries.append(
                await self._create_entry(
                    session,
                    asset_id,
                    tenant_id=tenant_id,
                    source="app_analytics",
                    metric="screen_views",
                    target_value=50000,
                    value=None,
                    capture_schedule="daily",
                    metadata={"notes": "Integração Firebase"},
                )
            )
        elif asset_catalog_id == "tabloid_space":
            entries.append(
                await self._create_entry(
                    session,
                    asset_id,
                    tenant_id=tenant_id,
                    source="print_partner",
                    metric="circulation",
                    target_value=200000,
                    value=None,
                    capture_schedule="weekly",
                    metadata={"notes": "Circulação enviada pela gráfica"},
                )
            )
        return entries

    async def _create_entry(
        self,
        session: AsyncSession,
        asset_id: str,
        *,
        tenant_id: str,
        source: str,
        metric: str,
        target_value: float | None,
        value: float | None,
        capture_schedule: str | None,
        metadata: dict | None,
    ) -> dict:
        await repository.record_automated_proof(
            session,
            asset_id,
            tenant_id=tenant_id,
            source=source,
            metric=metric,
            value=value,
            target_value=target_value,
            capture_schedule=capture_schedule,
            metadata=metadata,
        )
        return {
            "asset_id": asset_id,
            "source": source,
            "metric": metric,
            "target_value": target_value,
            "capture_schedule": capture_schedule,
        }
