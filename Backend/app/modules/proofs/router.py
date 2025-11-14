"""Routes for the proof/comprovacao module."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.dependencies.tenancy import get_tenant_session
from app.modules.proofs import catalog, repository, schemas
from app.modules.proofs.services import (
    AutomatedProofService,
    ProofDashboardService,
    ProofReminderService,
    SupplierPortalService,
    SupplierAlertService,
)
from app.modules.trade.repository import get_supplier

router = APIRouter()

dashboard_service = ProofDashboardService()
reminder_service = ProofReminderService()
automated_service = AutomatedProofService()
portal_service = SupplierPortalService()
alert_service = SupplierAlertService()


@router.get("/assets/catalog", response_model=list[schemas.AssetCatalog])
async def get_asset_catalog() -> list[schemas.AssetCatalog]:
    return [schemas.AssetCatalog.model_validate(asset.__dict__) for asset in catalog.DEFAULT_ASSETS_CATALOG]


@router.post(
    "/contracts",
    response_model=schemas.JBPContract,
    status_code=status.HTTP_201_CREATED,
)
async def create_contract(
    payload: schemas.JBPContractCreate,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.JBPContract:
    contract = await repository.create_contract(session, payload, tenant_id=context.tenant_id)
    await session.commit()
    return contract


@router.get("/contracts", response_model=schemas.ContractListResponse)
async def list_contracts(
    supplier_id: str | None = None,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.ContractListResponse:
    contracts = await repository.list_contracts(
        session,
        tenant_id=context.tenant_id,
        supplier_id=supplier_id,
    )
    return schemas.ContractListResponse(items=contracts, total=len(contracts))


@router.get("/contracts/{contract_id}", response_model=schemas.JBPContract)
async def get_contract_detail(
    contract_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.JBPContract:
    contract = await repository.get_contract(session, contract_id, tenant_id=context.tenant_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato nao encontrado.")
    return contract


@router.get("/contracts/{contract_id}/proof-dashboard", response_model=schemas.ProofDashboardResponse)
async def get_proof_dashboard(
    contract_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.ProofDashboardResponse:
    contract = await repository.get_contract(session, contract_id, tenant_id=context.tenant_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contrato nao encontrado.")
    supplier = await get_supplier(session, contract.supplier_id, tenant_id=context.tenant_id)
    supplier_name = supplier.name if supplier else "Fornecedor"
    data = await dashboard_service.generate_dashboard(
        session,
        contract_id,
        tenant_id=context.tenant_id,
        supplier_name=supplier_name,
    )
    return data


@router.post("/contracts/{contract_id}/reminders", status_code=status.HTTP_202_ACCEPTED)
async def schedule_reminders(
    contract_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> dict:
    await reminder_service.schedule_proof_reminders(session, contract_id, tenant_id=context.tenant_id)
    await session.commit()
    return {"status": "scheduled"}


@router.get("/contracts/reminders/overdue")
async def check_overdue_assets(
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> dict:
    overdue = await reminder_service.check_missing_proofs(session, tenant_id=context.tenant_id)
    return {"items": overdue}


@router.get("/assets/{asset_id}", response_model=schemas.JBPAsset)
async def get_asset_detail(
    asset_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.JBPAsset:
    asset = await repository.get_asset(session, asset_id, tenant_id=context.tenant_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo nao encontrado.")
    return asset


@router.get("/assets/{asset_id}/proofs", response_model=list[schemas.AssetProof])
async def get_asset_proofs(
    asset_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> list[schemas.AssetProof]:
    return await repository.list_asset_proofs(session, asset_id, tenant_id=context.tenant_id)


@router.post("/assets/{asset_id}/proofs", response_model=schemas.AssetProof, status_code=status.HTTP_201_CREATED)
async def upload_asset_proof(
    asset_id: str,
    payload: schemas.AssetProofCreate,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.AssetProof:
    proof = await repository.add_asset_proof(
        session,
        asset_id,
        payload,
        tenant_id=context.tenant_id,
        user_id=context.user_id,
    )
    await session.commit()
    return proof


@router.post("/assets/{asset_id}/automated/setup", response_model=list[dict])
async def setup_automated(
    asset_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> list[dict]:
    asset = await repository.get_asset(session, asset_id, tenant_id=context.tenant_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ativo nao encontrado.")
    records = await automated_service.setup_automated_proofs(
        session,
        asset_id,
        tenant_id=context.tenant_id,
        asset_catalog_id=asset.asset_catalog_id,
        placement_url=asset.metrics.get("placement_url") if isinstance(asset.metrics, dict) else None,
    )
    await session.commit()
    return records


@router.get("/proofs/history", response_model=schemas.ProofHistoryResponse)
async def list_proof_history(
    supplier_id: str | None = None,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.ProofHistoryResponse:
    entries = await repository.list_proof_history(
        session,
        tenant_id=context.tenant_id,
        supplier_id=supplier_id,
    )
    return schemas.ProofHistoryResponse(entries=entries)


@router.get("/suppliers/{supplier_id}/portal", response_model=schemas.SupplierPortalResponse)
async def get_supplier_portal(
    supplier_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.SupplierPortalResponse:
    return await portal_service.build_portal_view(session, supplier_id, tenant_id=context.tenant_id)


@router.get("/suppliers/{supplier_id}/alerts", response_model=list[schemas.SupplierAlert])
async def get_supplier_alerts(
    supplier_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> list[schemas.SupplierAlert]:
    return await alert_service.generate_alerts(session, supplier_id, tenant_id=context.tenant_id)


@router.post("/suppliers/{supplier_id}/reports/weekly", response_model=schemas.WeeklyEmailReport)
async def build_weekly_email(
    supplier_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
) -> schemas.WeeklyEmailReport:
    portal = await portal_service.build_portal_view(session, supplier_id, tenant_id=context.tenant_id)
    supplier = await get_supplier(session, supplier_id, tenant_id=context.tenant_id)
    supplier_name = supplier.name if supplier else "Fornecedor"
    return portal_service.build_weekly_email(portal, supplier_name)
