"""Supplier portal specific endpoints."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.dependencies.tenancy import get_tenant_session
from app.modules.supplier_portal import SupplierPortalFacade

router = APIRouter()
facade = SupplierPortalFacade()


@router.get("/dashboard")
async def supplier_dashboard(
    supplier_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    return await facade.get_dashboard(session, supplier_id, tenant_id=context.tenant_id)


@router.post("/reports/weekly")
async def supplier_weekly_report(
    supplier_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    return await facade.generate_weekly_report(session, supplier_id, tenant_id=context.tenant_id)
