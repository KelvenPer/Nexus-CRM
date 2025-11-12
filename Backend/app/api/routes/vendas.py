from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import TenantContext, get_tenant_context
from app.models import (
    AccountCreate,
    AccountResponse,
    ContactCreate,
    ContactResponse,
    LeadCreate,
    LeadResponse,
    OpportunityCreate,
    OpportunityResponse,
    ProductCreate,
    ProductResponse,
)
from app.services import data_store

router = APIRouter()


@router.get(
    "/leads",
    summary="List leads",
    response_model=list[LeadResponse],
)
async def list_leads(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_leads()


@router.post(
    "/leads",
    summary="Create a new lead",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lead(payload: LeadCreate, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.create_lead(payload)


@router.get(
    "/leads/{lead_id}",
    summary="Get a specific lead",
    response_model=LeadResponse,
)
async def get_lead(lead_id: str, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    try:
        return store.get_lead(lead_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead nao encontrado.") from None


@router.put(
    "/leads/{lead_id}",
    summary="Update a lead",
    response_model=LeadResponse,
)
async def update_lead(
    lead_id: str,
    payload: LeadCreate,
    context: TenantContext = Depends(get_tenant_context),
):
    store = data_store.get_store(context.tenant_id)
    try:
        return store.update_lead(lead_id, payload)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead nao encontrado.") from None


@router.delete(
    "/leads/{lead_id}",
    summary="Delete a lead",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_lead(lead_id: str, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    try:
        store.delete_lead(lead_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead nao encontrado.") from None


@router.get(
    "/oportunidades",
    summary="List opportunities",
    response_model=list[OpportunityResponse],
)
async def list_opportunities(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_opportunities()


@router.post(
    "/oportunidades",
    summary="Create a new opportunity",
    response_model=OpportunityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_opportunity(
    payload: OpportunityCreate,
    context: TenantContext = Depends(get_tenant_context),
):
    store = data_store.get_store(context.tenant_id)
    return store.create_opportunity(payload)


@router.get(
    "/oportunidades/{op_id}",
    summary="Get a specific opportunity",
    response_model=OpportunityResponse,
)
async def get_opportunity(op_id: str, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    try:
        return store.get_opportunity(op_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oportunidade nao encontrada.") from None


@router.put(
    "/oportunidades/{op_id}",
    summary="Update an opportunity",
    response_model=OpportunityResponse,
)
async def update_opportunity(
    op_id: str,
    payload: OpportunityCreate,
    context: TenantContext = Depends(get_tenant_context),
):
    store = data_store.get_store(context.tenant_id)
    try:
        return store.update_opportunity(op_id, payload)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oportunidade nao encontrada.") from None


@router.delete(
    "/oportunidades/{op_id}",
    summary="Delete an opportunity",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_opportunity(op_id: str, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    try:
        store.delete_opportunity(op_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Oportunidade nao encontrada.") from None


@router.get(
    "/contas",
    summary="List accounts",
    response_model=list[AccountResponse],
)
async def list_accounts(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_accounts()


@router.post(
    "/contas",
    summary="Create a new account",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_account(payload: AccountCreate, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.create_account(payload)


@router.get(
    "/contatos",
    summary="List contacts",
    response_model=list[ContactResponse],
)
async def list_contacts(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_contacts()


@router.post(
    "/contatos",
    summary="Create a new contact",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_contact(payload: ContactCreate, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.create_contact(payload)


@router.get(
    "/produtos",
    summary="List products",
    response_model=list[ProductResponse],
)
async def list_products(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_products()


@router.post(
    "/produtos",
    summary="Create a new product",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(payload: ProductCreate, context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.create_product(payload)
