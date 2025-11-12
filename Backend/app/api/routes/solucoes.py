from fastapi import APIRouter, Depends

from app.core.security import TenantContext, get_tenant_context
from app.models import SupportTicket, TradeVisit
from app.services import data_store

router = APIRouter()


@router.get(
    "/trade-marketing/visitas",
    summary="List trade marketing visits",
    response_model=list[TradeVisit],
)
async def list_trade_visits(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_trade_visits()


@router.get(
    "/atendimento/tickets",
    summary="List customer service tickets",
    response_model=list[SupportTicket],
)
async def list_support_tickets(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_support_tickets()
