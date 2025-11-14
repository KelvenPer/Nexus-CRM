"""Report endpoints."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.dependencies.tenancy import get_tenant_session
from app.middleware import report_cache
from .orchestrator import ReportOrchestratorService

router = APIRouter()
service = ReportOrchestratorService()


@router.post("/generate")
async def generate_report(
    contract_id: str,
    report_type: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    report_id = await service.generate_contract_report(
        session,
        tenant_id=context.tenant_id,
        supplier_id=context.tenant_id,
        contract_id=contract_id,
        report_type=report_type,
    )
    return {"report_id": report_id}


@router.get("/{report_id}")
async def report_detail(
    report_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    cache_key = f"report:{report_id}:{context.tenant_id}"
    cached = report_cache.get(cache_key)
    if cached:
        return cached
    report = await service.get_report(session, report_id, tenant_id=context.tenant_id, supplier_id=context.tenant_id)
    if not report:
        raise HTTPException(status_code=404, detail="Relatorio nao encontrado.")
    payload = {"report": report}
    report_cache.set(cache_key, payload, ttl_seconds=300)
    return payload


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    report = await service.get_report(session, report_id, tenant_id=context.tenant_id, supplier_id=context.tenant_id)
    if not report or report["status"] != "completed":
        raise HTTPException(status_code=404, detail="Relatorio nao disponivel.")
    await service.increment_download(session, report_id)
    await session.commit()
    return FileResponse(
        Path(report["file_path"]),
        media_type="application/pdf",
        filename=f"{report['title']}.pdf",
    )
