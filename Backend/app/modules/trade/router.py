"""FastAPI routes for Trade module."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.dependencies.tenancy import get_tenant_session
from app.modules.data.services.roi_calculation import ROICalculationService
from app.modules.trade import repository, schemas

router = APIRouter()

roi_service = ROICalculationService()


def _project_roi(roi_calculation) -> schemas.ROIProjection | None:
    if not roi_calculation:
        return None
    return schemas.ROIProjection(
        basic_roi=roi_calculation.basic_roi,
        incremental_roi=roi_calculation.incremental_roi,
        causality_confidence=roi_calculation.causality_confidence,
        future_projection=roi_calculation.future_projection,
        recommendations=roi_calculation.recommendations,
    )


@router.post(
    "/jbp",
    response_model=schemas.JBPDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_jbp_plan(
    payload: schemas.JBPCreationRequest,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.JBPDetailResponse:
    supplier = await repository.get_supplier(session, payload.supplier_id, tenant_id=context.tenant_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor nao encontrado.")

    plan = await repository.create_jbp_plan(session, payload, tenant_id=context.tenant_id)
    await session.commit()
    roi_snapshot = await roi_service.calculate_jbp_roi(session, plan.id, tenant_id=context.tenant_id)
    await session.commit()
    return schemas.JBPDetailResponse(plan=plan, supplier=supplier, roi=_project_roi(roi_snapshot))


@router.get(
    "/jbp/{jbp_id}",
    response_model=schemas.JBPDetailResponse,
)
async def get_jbp(
    jbp_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.JBPDetailResponse:
    plan = await repository.get_jbp_plan(session, jbp_id, tenant_id=context.tenant_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="JBP nao encontrado.")
    supplier = await repository.get_supplier(session, plan.supplier_id, tenant_id=context.tenant_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor nao encontrado.")
    roi_snapshot = await roi_service.calculate_jbp_roi(session, plan.id, tenant_id=context.tenant_id)
    await session.commit()
    return schemas.JBPDetailResponse(plan=plan, supplier=supplier, roi=_project_roi(roi_snapshot))


@router.get(
    "/jbp",
    response_model=schemas.JBPListResponse,
)
async def list_active_jbp(
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.JBPListResponse:
    plans = await repository.list_active_jbps(session, tenant_id=context.tenant_id)
    return schemas.JBPListResponse(items=plans, total=len(plans))
