"""Data module routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.dependencies.tenancy import get_tenant_session
from app.modules.data.schemas import ImportSalesResponse, SupplierReport
from app.modules.data.services.comparison import SalesComparisonService
from app.modules.data.services.importer import SalesImportService
from app.modules.data.services.insights import InsightEngineService, InsightPrioritizationService
from app.modules.data.services.performance import SupplierPerformanceService
from app.modules.data.services.roi_calculation import ROICalculationService

router = APIRouter()

roi_service = ROICalculationService()
insight_engine = InsightEngineService()
prioritization_service = InsightPrioritizationService()
comparison_service = SalesComparisonService()
performance_service = SupplierPerformanceService(
    roi_service=roi_service,
    insight_engine=insight_engine,
    prioritization_service=prioritization_service,
    comparison_service=comparison_service,
)
import_service = SalesImportService()


@router.get(
    "/supplier-report/{supplier_id}",
    response_model=SupplierReport,
)
async def get_supplier_report(
    supplier_id: str,
    context: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_tenant_session),
) -> SupplierReport:
    return await performance_service.generate_supplier_report(
        session,
        supplier_id,
        tenant_id=context.tenant_id,
    )


@router.post(
    "/import-sales",
    response_model=ImportSalesResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_sales_data(
    file: UploadFile = File(...),
    context: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_tenant_session),
) -> ImportSalesResponse:
    try:
        return await import_service.import_file(session, file=file, tenant_id=context.tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
