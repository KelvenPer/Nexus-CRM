from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import TenantContext, get_tenant_context
from app.models import (
    AutomationTriggerCreate,
    AutomationTriggerResponse,
    EmailTemplateCreate,
    EmailTemplateResponse,
    WorkflowCreate,
    WorkflowResponse,
    WorkflowRunResponse,
)
from app.services import data_store

router = APIRouter()


@router.get(
    "/workflows",
    summary="List workflow definitions",
    response_model=list[WorkflowResponse],
)
async def list_workflows(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_workflows()


@router.post(
    "/workflows",
    summary="Save a workflow definition",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
)
async def save_workflow(
    payload: WorkflowCreate,
    context: TenantContext = Depends(get_tenant_context),
) -> WorkflowResponse:
    store = data_store.get_store(context.tenant_id)
    return store.save_workflow(payload)


@router.post(
    "/workflows/{wf_id}/run",
    summary="Trigger a workflow",
    response_model=WorkflowRunResponse,
)
async def run_workflow(
    wf_id: str,
    context: TenantContext = Depends(get_tenant_context),
) -> WorkflowRunResponse:
    store = data_store.get_store(context.tenant_id)
    try:
        return store.trigger_workflow(wf_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow nao encontrado.") from None


@router.get(
    "/gatilhos",
    summary="List data triggers",
    response_model=list[AutomationTriggerResponse],
)
async def list_triggers(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_triggers()


@router.post(
    "/gatilhos",
    summary="Create a data trigger",
    response_model=AutomationTriggerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_trigger(
    payload: AutomationTriggerCreate,
    context: TenantContext = Depends(get_tenant_context),
) -> AutomationTriggerResponse:
    store = data_store.get_store(context.tenant_id)
    return store.create_trigger(payload)


@router.get(
    "/templates",
    summary="List email templates",
    response_model=list[EmailTemplateResponse],
)
async def list_templates(context: TenantContext = Depends(get_tenant_context)):
    store = data_store.get_store(context.tenant_id)
    return store.list_email_templates()


@router.post(
    "/templates",
    summary="Create an e-mail template",
    response_model=EmailTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    payload: EmailTemplateCreate,
    context: TenantContext = Depends(get_tenant_context),
) -> EmailTemplateResponse:
    store = data_store.get_store(context.tenant_id)
    return store.create_email_template(payload)
