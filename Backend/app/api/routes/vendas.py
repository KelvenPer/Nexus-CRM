from fastapi import APIRouter, Depends, HTTPException, status, Response, Query

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
    response_class=Response,
)
async def delete_lead(lead_id: str, context: TenantContext = Depends(get_tenant_context)) -> Response:
    store = data_store.get_store(context.tenant_id)
    try:
        store.delete_lead(lead_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
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
    response_class=Response,
)
async def delete_opportunity(op_id: str, context: TenantContext = Depends(get_tenant_context)) -> Response:
    store = data_store.get_store(context.tenant_id)
    try:
        store.delete_opportunity(op_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
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


@router.get(
    "/scanntech/indicadores",
    summary="Indicadores agregados de vendas via Scanntech (mock)",
)
async def scanntech_indicadores(
    periodo: str = Query(default="6m", pattern=r"^(3m|6m|12m)$"),
    loja: str | None = Query(default=None),
    context: TenantContext = Depends(get_tenant_context),
) -> dict:
    store = data_store.get_store(context.tenant_id)
    # Mock simples baseado nos dados existentes
    oportunidades = store.list_opportunities()
    receita_total = sum(getattr(op, "valor", 0.0) for op in oportunidades) if oportunidades else 0.0
    kpis = [
        {"label": "Receita Total", "value": receita_total, "change": +12.5},
        {"label": "Novos Clientes", "value": 1800, "change": -3.1},
        {"label": "Taxa de Conversao", "value": 7.8, "change": +0.9},
        {"label": "Ticket Medio", "value": 250.0, "change": +5.0},
    ]

    # Gerar labels/valores conforme periodo
    import calendar
    from datetime import datetime, timedelta

    def gen_series(months: int):
        now = datetime.utcnow().replace(day=1)
        labels = []
        values = []
        for i in range(months, 0, -1):
            dt = now - timedelta(days=30 * i)
            labels.append(calendar.month_abbr[(dt.month)] or str(dt.month))
            base = 400000 + (i * 20000)
            jitter = (i * 12345) % 70000
            values.append(base + jitter)
        return labels, values

    months = 6 if periodo == "6m" else (3 if periodo == "3m" else 12)
    labels, values = gen_series(months)
    tendencia = {"labels": labels, "values": values}

    # KPI por loja (mock simples)
    lojas = ["Todas", "Loja A", "Loja B", "Loja C"]
    por_loja = [
        {"loja": l, "receita": 200000.0 + idx * 75000.0, "conversao": 5.0 + idx * 1.2}
        for idx, l in enumerate(lojas)
    ]
    if loja and loja in lojas:
        por_loja = [x for x in por_loja if x["loja"] == loja]
    top_oportunidades = [
        {"nome": "Projeto Alpha Corp", "valor": 850000, "prazo": "15 dias"},
        {"nome": "Renovacao Beta Ltda", "valor": 320000, "prazo": "1 semana"},
        {"nome": "Expansao Gama S.A.", "valor": 1200000, "prazo": "1 mes"},
        {"nome": "Novo Contrato Delta", "valor": 150000, "prazo": "Aguardando assinatura"},
        {"nome": "Upgrade Epsilon", "valor": 90000, "prazo": "Em negociacao"},
    ]
    return {
        "kpis": kpis,
        "tendencia": tendencia,
        "topOportunidades": top_oportunidades,
        "porLoja": por_loja,
        "periodo": periodo,
        "loja": loja or "Todas",
    }
