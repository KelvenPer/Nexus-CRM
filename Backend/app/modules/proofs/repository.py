"""Repository helpers for proof module."""
from __future__ import annotations

import json
from typing import Any, Iterable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.proofs import schemas
from app.modules.proofs.catalog import DEFAULT_ASSETS_CATALOG


def _dump(obj: Any) -> str:
    return json.dumps(obj or {})


async def create_contract(
    session: AsyncSession,
    payload: schemas.JBPContractCreate,
    *,
    tenant_id: str,
) -> schemas.JBPContract:
    stmt = text(
        """
        INSERT INTO trade_jbp_contracts (
            id, tenant_id, supplier_id, title, status, total_investment,
            start_date, end_date, proof_status, completion_percentage
        )
        VALUES (
            gen_random_uuid(), :tenant_id, :supplier_id, :title, :status, :total_investment,
            :start_date, :end_date, 'pending', 0
        )
        RETURNING *
        """
    )
    result = await session.execute(
        stmt,
        {
            "tenant_id": tenant_id,
            "supplier_id": payload.supplier_id,
            "title": payload.title,
            "status": payload.status,
            "total_investment": payload.total_investment,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
        },
    )
    contract_row = result.mappings().one()
    contract_id = contract_row["id"]

    catalog_map = {asset.id: asset for asset in DEFAULT_ASSETS_CATALOG}

    for asset in payload.assets:
        catalog_entry = catalog_map.get(asset.asset_catalog_id)
        proofs_required = [req.__dict__ for req in catalog_entry.proof_requirements] if catalog_entry else []
        metrics = {"expected_metrics": catalog_entry.expected_metrics} if catalog_entry else {}
        await session.execute(
            text(
                """
                INSERT INTO trade_jbp_contract_assets (
                    id, tenant_id, contract_id, asset_catalog_id, asset_name,
                    placement, duration_days, cost, scheduled_start, scheduled_end,
                    status, proofs_required, metrics
                )
                VALUES (
                    gen_random_uuid(), :tenant_id, :contract_id, :asset_catalog_id, :asset_name,
                    :placement, :duration_days, :cost, :scheduled_start, :scheduled_end,
                    'scheduled', :proofs_required::jsonb, :metrics::jsonb
                )
                """
            ),
            {
                "tenant_id": tenant_id,
                "contract_id": contract_id,
                "asset_catalog_id": asset.asset_catalog_id,
                "asset_name": asset.asset_name,
                "placement": asset.placement,
                "duration_days": asset.duration_days,
                "cost": asset.cost,
                "scheduled_start": asset.scheduled_start,
                "scheduled_end": asset.scheduled_end,
                "proofs_required": json.dumps(proofs_required),
                "metrics": json.dumps(metrics),
            },
        )

    return schemas.JBPContract(
        id=str(contract_id),
        supplier_id=payload.supplier_id,
        title=payload.title,
        status=payload.status,
        selected_assets=[],
        total_investment=payload.total_investment,
        start_date=payload.start_date,
        end_date=payload.end_date,
        proof_status="pending",
        completion_percentage=0,
    )


async def list_contracts(
    session: AsyncSession,
    *,
    tenant_id: str,
    supplier_id: str | None = None,
) -> list[schemas.JBPContract]:
    where = ["tenant_id = :tenant_id"]
    params: dict[str, Any] = {"tenant_id": tenant_id}
    if supplier_id:
        where.append("supplier_id = :supplier_id")
        params["supplier_id"] = supplier_id
    stmt = text(
        f"""
        SELECT *
        FROM trade_jbp_contracts
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC
        """
    )
    rows = (await session.execute(stmt, params)).mappings().all()
    return [
        schemas.JBPContract(
            id=str(row["id"]),
            supplier_id=str(row["supplier_id"]),
            title=row["title"],
            status=row["status"],
            selected_assets=[],
            total_investment=float(row["total_investment"] or 0),
            start_date=row["start_date"],
            end_date=row["end_date"],
            proof_status=row["proof_status"],
            completion_percentage=float(row["completion_percentage"] or 0),
        )
        for row in rows
    ]


async def get_contract(
    session: AsyncSession,
    contract_id: str,
    *,
    tenant_id: str,
) -> schemas.JBPContract | None:
    stmt = text(
        """
        SELECT *
        FROM trade_jbp_contracts
        WHERE id = :contract_id AND tenant_id = :tenant_id
        """
    )
    row = (await session.execute(stmt, {"contract_id": contract_id, "tenant_id": tenant_id})).mappings().first()
    if not row:
        return None
    assets = await list_contract_assets(session, contract_id, tenant_id=tenant_id)
    return schemas.JBPContract(
        id=str(row["id"]),
        supplier_id=str(row["supplier_id"]),
        title=row["title"],
        status=row["status"],
        selected_assets=assets,
        total_investment=float(row["total_investment"] or 0),
        start_date=row["start_date"],
        end_date=row["end_date"],
        proof_status=row["proof_status"],
        completion_percentage=float(row["completion_percentage"] or 0),
    )


async def list_contract_assets(
    session: AsyncSession,
    contract_id: str,
    *,
    tenant_id: str,
) -> list[schemas.JBPAsset]:
    stmt = text(
        """
        SELECT *
        FROM trade_jbp_contract_assets
        WHERE contract_id = :contract_id AND tenant_id = :tenant_id
        ORDER BY scheduled_start
        """
    )
    rows = (await session.execute(stmt, {"contract_id": contract_id, "tenant_id": tenant_id})).mappings().all()
    assets: list[schemas.JBPAsset] = []
    for row in rows:
        proofs = await list_asset_proofs(session, str(row["id"]), tenant_id=tenant_id)
        assets.append(
            schemas.JBPAsset(
                id=str(row["id"]),
                asset_catalog_id=row["asset_catalog_id"],
                asset_name=row["asset_name"],
                placement=row.get("placement"),
                duration_days=int(row["duration_days"] or 0),
                cost=float(row["cost"] or 0),
                scheduled_start=row["scheduled_start"],
                scheduled_end=row["scheduled_end"],
                actual_start=row.get("actual_start"),
                actual_end=row.get("actual_end"),
                status=row["status"],
                proofs_required=row.get("proofs_required") or [],
                metrics=row.get("metrics") or {},
                proofs=proofs,
            )
        )
    return assets


async def get_asset(
    session: AsyncSession,
    asset_id: str,
    *,
    tenant_id: str,
) -> schemas.JBPAsset | None:
    stmt = text(
        """
        SELECT *
        FROM trade_jbp_contract_assets
        WHERE id = :asset_id AND tenant_id = :tenant_id
        """
    )
    row = (await session.execute(stmt, {"asset_id": asset_id, "tenant_id": tenant_id})).mappings().first()
    if not row:
        return None
    proofs = await list_asset_proofs(session, asset_id, tenant_id=tenant_id)
    return schemas.JBPAsset(
        id=str(row["id"]),
        asset_catalog_id=row["asset_catalog_id"],
        asset_name=row["asset_name"],
        placement=row.get("placement"),
        duration_days=int(row["duration_days"] or 0),
        cost=float(row["cost"] or 0),
        scheduled_start=row["scheduled_start"],
        scheduled_end=row["scheduled_end"],
        actual_start=row.get("actual_start"),
        actual_end=row.get("actual_end"),
        status=row["status"],
        proofs_required=row.get("proofs_required") or [],
        metrics=row.get("metrics") or {},
        proofs=proofs,
    )


async def list_asset_proofs(
    session: AsyncSession,
    asset_id: str,
    *,
    tenant_id: str,
) -> list[schemas.AssetProof]:
    stmt = text(
        """
        SELECT *
        FROM trade_asset_proofs
        WHERE contract_asset_id = :asset_id AND tenant_id = :tenant_id
        ORDER BY uploaded_at DESC
        """
    )
    rows = (await session.execute(stmt, {"asset_id": asset_id, "tenant_id": tenant_id})).mappings().all()
    return [
        schemas.AssetProof(
            id=str(row["id"]),
            proof_type=row["proof_type"],
            url=row["url"],
            description=row.get("description"),
            uploaded_by=row.get("uploaded_by"),
            uploaded_at=row["uploaded_at"],
            verified=row["verified"],
            verified_by=row.get("verified_by"),
            verified_at=row.get("verified_at"),
        )
        for row in rows
    ]


async def add_asset_proof(
    session: AsyncSession,
    asset_id: str,
    payload: schemas.AssetProofCreate,
    *,
    tenant_id: str,
    user_id: str,
) -> schemas.AssetProof:
    stmt = text(
        """
        INSERT INTO trade_asset_proofs (
            id, tenant_id, contract_asset_id, proof_type, url, description, uploaded_by
        )
        VALUES (
            gen_random_uuid(), :tenant_id, :asset_id, :proof_type, :url, :description, :uploaded_by
        )
        RETURNING *
        """
    )
    row = (
        await session.execute(
            stmt,
            {
                "tenant_id": tenant_id,
                "asset_id": asset_id,
                "proof_type": payload.proof_type,
                "url": payload.url,
                "description": payload.description,
                "uploaded_by": user_id,
            },
        )
    ).mappings().one()
    await _update_asset_status(session, asset_id, tenant_id=tenant_id)
    return schemas.AssetProof(
        id=str(row["id"]),
        proof_type=row["proof_type"],
        url=row["url"],
        description=row.get("description"),
        uploaded_by=row.get("uploaded_by"),
        uploaded_at=row["uploaded_at"],
        verified=row["verified"],
        verified_by=row.get("verified_by"),
        verified_at=row.get("verified_at"),
    )


async def _update_asset_status(session: AsyncSession, asset_id: str, *, tenant_id: str) -> None:
    proof_count_stmt = text(
        """
        SELECT COUNT(*) AS total
        FROM trade_asset_proofs
        WHERE contract_asset_id = :asset_id AND tenant_id = :tenant_id
        """
    )
    count = (
        await session.execute(proof_count_stmt, {"asset_id": asset_id, "tenant_id": tenant_id})
    ).mappings().one()["total"]
    status = "verified" if count else "executed"
    await session.execute(
        text(
            """
            UPDATE trade_jbp_contract_assets
            SET status = :status
            WHERE id = :asset_id AND tenant_id = :tenant_id
            """
        ),
        {"status": status, "asset_id": asset_id, "tenant_id": tenant_id},
    )


async def record_automated_proof(
    session: AsyncSession,
    asset_id: str,
    *,
    tenant_id: str,
    source: str,
    metric: str,
    value: float | None,
    target_value: float | None,
    capture_schedule: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    await session.execute(
        text(
            """
            INSERT INTO trade_asset_automated_proofs (
                id, tenant_id, contract_asset_id, source, metric, target_value,
                value, capture_schedule, metadata
            )
            VALUES (
                gen_random_uuid(), :tenant_id, :asset_id, :source, :metric, :target_value,
                :value, :capture_schedule, :metadata::jsonb
            )
            """
        ),
        {
            "tenant_id": tenant_id,
            "asset_id": asset_id,
            "source": source,
            "metric": metric,
            "target_value": target_value,
            "value": value,
            "capture_schedule": capture_schedule,
            "metadata": _dump(metadata or {}),
        },
    )


async def schedule_notification(
    session: AsyncSession,
    *,
    tenant_id: str,
    asset_id: str,
    message: str,
    send_at: datetime,
    channel: str = "email",
) -> None:
    await session.execute(
        text(
            """
            INSERT INTO trade_proof_notifications (
                id, tenant_id, contract_asset_id, message, send_at, channel
            )
            VALUES (
                gen_random_uuid(), :tenant_id, :asset_id, :message, :send_at, :channel
            )
            """
        ),
        {"tenant_id": tenant_id, "asset_id": asset_id, "message": message, "send_at": send_at, "channel": channel},
    )


async def get_assets_for_contract(
    session: AsyncSession,
    contract_id: str,
    *,
    tenant_id: str,
) -> Iterable[dict[str, Any]]:
    stmt = text(
        """
        SELECT id, asset_name, scheduled_start, scheduled_end
        FROM trade_jbp_contract_assets
        WHERE contract_id = :contract_id AND tenant_id = :tenant_id
        """
    )
    return (await session.execute(stmt, {"contract_id": contract_id, "tenant_id": tenant_id})).mappings().all()


async def get_overdue_assets(
    session: AsyncSession,
    *,
    tenant_id: str,
    supplier_id: str | None = None,
) -> list[dict[str, Any]]:
    stmt = text(
        """
        SELECT a.id, a.asset_name, a.scheduled_end,
               EXTRACT(DAY FROM (NOW() - a.scheduled_end))::INT AS days_overdue
        FROM trade_jbp_contract_assets a
        LEFT JOIN trade_asset_proofs p ON p.contract_asset_id = a.id
        JOIN trade_jbp_contracts c ON c.id = a.contract_id
        WHERE a.tenant_id = :tenant_id
          AND (:supplier_id IS NULL OR c.supplier_id = :supplier_id)
          AND a.scheduled_end < NOW()
        GROUP BY a.id
        HAVING COUNT(p.id) = 0
        """
    )
    rows = (
        await session.execute(stmt, {"tenant_id": tenant_id, "supplier_id": supplier_id})
    ).mappings().all()
    return [dict(row) for row in rows]


async def list_proof_history(
    session: AsyncSession,
    *,
    tenant_id: str,
    supplier_id: str | None = None,
) -> list[schemas.ProofHistoryEntry]:
    stmt = text(
        """
        SELECT c.id AS contract_id,
               a.asset_name,
               p.proof_type,
               p.url,
               p.uploaded_at,
               CASE WHEN p.verified THEN 'approved' ELSE 'submitted' END AS status
        FROM trade_asset_proofs p
        JOIN trade_jbp_contract_assets a ON a.id = p.contract_asset_id
        JOIN trade_jbp_contracts c ON c.id = a.contract_id
        WHERE p.tenant_id = :tenant_id
          AND (:supplier_id IS NULL OR c.supplier_id = :supplier_id)
        ORDER BY p.uploaded_at DESC
        LIMIT 200
        """
    )
    rows = (
        await session.execute(stmt, {"tenant_id": tenant_id, "supplier_id": supplier_id})
    ).mappings().all()
    return [
        schemas.ProofHistoryEntry(
            contract_id=str(row["contract_id"]),
            asset_name=row["asset_name"],
            proof_type=row["proof_type"],
            url=row["url"],
            uploaded_at=row["uploaded_at"],
            status=row["status"],
        )
        for row in rows
    ]
