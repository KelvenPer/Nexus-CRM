from fastapi import APIRouter, Depends, status

from app.core.security import TenantContext, get_tenant_context
from app.models import CampaignCreate, CampaignResponse, SegmentCreate, SegmentResponse
from app.services import data_store

router = APIRouter()


@router.get(
    "/campanhas",
    summary="List campaigns",
    response_model=list[CampaignResponse],
)
async def list_campaigns(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_campaigns()


@router.post(
    "/campanhas",
    summary="Create a new campaign",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign(
    payload: CampaignCreate,
    context: TenantContext = Depends(get_tenant_context),
) -> CampaignResponse:
    store = data_store.get_store(context.tenant_id)
    return store.create_campaign(payload)


@router.get(
    "/segmentos",
    summary="List segments",
    response_model=list[SegmentResponse],
)
async def list_segments(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_segments()


@router.post(
    "/segmentos",
    summary="Create a new segment",
    response_model=SegmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_segment(
    payload: SegmentCreate,
    context: TenantContext = Depends(get_tenant_context),
) -> SegmentResponse:
    store = data_store.get_store(context.tenant_id)
    return store.create_segment(payload)
