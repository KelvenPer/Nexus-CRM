"""Repository helpers for Trade module."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.trade import schemas


def _json_dump(value: list[str] | None) -> str:
    return json.dumps(value or [])


def _row_to_plan(row: Any) -> schemas.JBPPlan:
    mapping = dict(row)
    mapping["counter_parties"] = mapping.get("counter_parties") or []
    mapping["exclusive_benefits"] = mapping.get("exclusive_benefits") or []
    return schemas.JBPPlan.model_validate(mapping)


def _row_to_supplier(row: Any) -> schemas.Supplier:
    mapping = dict(row)
    return schemas.Supplier.model_validate(mapping)


async def get_supplier(session: AsyncSession, supplier_id: str, *, tenant_id: str) -> schemas.Supplier | None:
    stmt = text(
        """
        SELECT *
        FROM trade_suppliers
        WHERE id = :supplier_id AND tenant_id = :tenant_id
        """
    )
    result = await session.execute(stmt, {"supplier_id": supplier_id, "tenant_id": tenant_id})
    row = result.mappings().first()
    if not row:
        return None
    return _row_to_supplier(row)


async def create_jbp_plan(
    session: AsyncSession,
    payload: schemas.JBPCreationRequest,
    *,
    tenant_id: str,
) -> schemas.JBPPlan:
    stmt = text(
        """
        INSERT INTO trade_jbp_plans (
            id, tenant_id, supplier_id, title, description,
            start_date, end_date, investment_value, investment_type,
            expected_roi, counter_parties, exclusive_benefits, status,
            sales_target, growth_target
        )
        VALUES (
            gen_random_uuid(), :tenant_id, :supplier_id, :title, :description,
            :start_date, :end_date, :investment_value, :investment_type,
            :expected_roi, :counter_parties::jsonb, :exclusive_benefits::jsonb, :status,
            :sales_target, :growth_target
        )
        RETURNING *
        """
    )
    params = {
        "tenant_id": tenant_id,
        "supplier_id": payload.supplier_id,
        "title": payload.title,
        "description": payload.description,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "investment_value": payload.investment_value,
        "investment_type": payload.investment_type,
        "expected_roi": payload.expected_roi,
        "counter_parties": _json_dump(payload.counter_parties),
        "exclusive_benefits": _json_dump(payload.exclusive_benefits),
        "status": payload.status,
        "sales_target": payload.sales_target,
        "growth_target": payload.growth_target,
    }
    result = await session.execute(stmt, params)
    row = result.mappings().one()
    return _row_to_plan(row)


async def get_jbp_plan(session: AsyncSession, jbp_id: str, *, tenant_id: str) -> schemas.JBPPlan | None:
    stmt = text(
        """
        SELECT *
        FROM trade_jbp_plans
        WHERE id = :jbp_id AND tenant_id = :tenant_id
        """
    )
    result = await session.execute(stmt, {"jbp_id": jbp_id, "tenant_id": tenant_id})
    row = result.mappings().first()
    if not row:
        return None
    return _row_to_plan(row)


async def list_active_jbps(
    session: AsyncSession,
    *,
    tenant_id: str,
    limit: int = 50,
) -> list[schemas.JBPPlan]:
    stmt = text(
        """
        SELECT *
        FROM trade_jbp_plans
        WHERE tenant_id = :tenant_id
          AND status IN ('approved', 'active')
        ORDER BY start_date DESC
        LIMIT :limit
        """
    )
    result = await session.execute(stmt, {"tenant_id": tenant_id, "limit": limit})
    return [_row_to_plan(row) for row in result.mappings().all()]
