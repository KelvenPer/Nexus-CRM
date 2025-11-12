from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.db.session import get_session
from app.models import (
    DashboardListResponse,
    DashboardSaveRequest,
    MetaObjectCreate,
    MetaObjectPermissionResponse,
    MetaObjectPermissionUpdate,
    MetaObjectResponse,
    SchemasResponse,
    SQLTestRequest,
    SQLTestResponse,
    WidgetPayload,
    WidgetQueryRequest,
    WidgetQueryResponse,
)
from app.services import data_store, validar_e_executar_sql_seguro
from app.services.data_store import BASE_TABLES, DEFAULT_PROFILES

router = APIRouter()


@router.post(
    "/query/test",
    summary="Execute a test SQL query securely",
    response_model=SQLTestResponse,
)
async def test_sql_query(
    query: SQLTestRequest,
    session: AsyncSession = Depends(get_session),
    context: TenantContext = Depends(get_tenant_context),
) -> SQLTestResponse:
    validation = await validar_e_executar_sql_seguro(query.query, session=session)
    return SQLTestResponse(
        isValid=True,
        rowsAffected=validation.rows_affected,
        normalizedQuery=validation.normalized_query,
        message=f"Consulta validada para o tenant {context.tenant_id}.",
        time=f"{validation.execution_time_ms}ms",
        results=validation.sample_rows,
    )


@router.get(
    "/meta/schemas",
    summary="List schemas and objects for SchemaBrowser",
    response_model=SchemasResponse,
)
async def get_meta_schemas(
    context: TenantContext = Depends(get_tenant_context),
) -> SchemasResponse:
    store = data_store.get_store(context.tenant_id)
    objetos_custom = [obj.nomeAmigavel for obj in store.list_meta_objects() if obj.tipo == "CUSTOMIZADO"]
    return SchemasResponse(tabelasBase=BASE_TABLES, objetosCustom=objetos_custom)


@router.get(
    "/meta-objetos",
    summary="List custom meta-objects",
    response_model=list[MetaObjectResponse],
)
async def list_meta_objects(
    context: TenantContext = Depends(get_tenant_context),
) -> list[MetaObjectResponse]:
    store = data_store.get_store(context.tenant_id)
    return store.list_meta_objects()


@router.get(
    "/meta-objetos/disponiveis",
    summary="List meta-objects available for the current user",
    response_model=list[MetaObjectResponse],
)
async def list_available_meta_objects(
    context: TenantContext = Depends(get_tenant_context),
) -> list[MetaObjectResponse]:
    store = data_store.get_store(context.tenant_id)
    if context.has_role("data_admin"):
        return store.list_meta_objects()
    return store.list_meta_objects_for_roles(context.roles)


@router.post(
    "/meta-objetos",
    summary="Save a new custom meta-object",
    response_model=MetaObjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_meta_object(
    payload: MetaObjectCreate,
    context: TenantContext = Depends(get_tenant_context),
) -> MetaObjectResponse:
    store = data_store.get_store(context.tenant_id)
    return store.create_meta_object(payload)


@router.get(
    "/meta-objetos/{meta_id}/permissoes",
    summary="Get permissions for a meta-object",
    response_model=MetaObjectPermissionResponse,
)
async def get_meta_object_permissions(
    meta_id: str,
    context: TenantContext = Depends(get_tenant_context),
) -> MetaObjectPermissionResponse:
    store = data_store.get_store(context.tenant_id)
    record = next((obj for obj in store.list_meta_objects() if obj.metaId == meta_id), None)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta objeto nao encontrado.")
    return MetaObjectPermissionResponse(
        profiles=[profile.id for profile in record.profiles],
        availableProfiles=DEFAULT_PROFILES,
    )


@router.put(
    "/meta-objetos/{meta_id}/permissoes",
    summary="Update permissions for a meta-object",
    response_model=MetaObjectResponse,
)
async def update_meta_object_permissions(
    meta_id: str,
    payload: MetaObjectPermissionUpdate,
    context: TenantContext = Depends(get_tenant_context),
) -> MetaObjectResponse:
    store = data_store.get_store(context.tenant_id)
    try:
        return store.update_permissions(meta_id, payload.profiles)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta objeto nao encontrado.") from None


@router.get(
    "/dashboards",
    summary="List dashboards",
    response_model=DashboardListResponse,
)
async def list_dashboards(
    context: TenantContext = Depends(get_tenant_context),
) -> DashboardListResponse:
    store = data_store.get_store(context.tenant_id)
    return DashboardListResponse(dashboards=store.list_dashboards())


@router.post(
    "/dashboards",
    summary="Save a dashboard with widgets",
    response_model=DashboardSaveRequest,
    status_code=status.HTTP_201_CREATED,
)
async def save_dashboard(
    payload: DashboardSaveRequest,
    context: TenantContext = Depends(get_tenant_context),
) -> DashboardSaveRequest:
    store = data_store.get_store(context.tenant_id)
    return store.save_dashboard(payload)


@router.get(
    "/dashboards/{dashboard_id}",
    summary="Get a single dashboard",
    response_model=DashboardSaveRequest,
)
async def get_dashboard(
    dashboard_id: str,
    context: TenantContext = Depends(get_tenant_context),
) -> DashboardSaveRequest:
    store = data_store.get_store(context.tenant_id)
    dashboard = store.get_dashboard(dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard nao encontrado.")
    return dashboard


@router.put(
    "/dashboards/{dashboard_id}",
    summary="Update an existing dashboard",
    response_model=DashboardSaveRequest,
)
async def update_dashboard(
    dashboard_id: str,
    payload: DashboardSaveRequest,
    context: TenantContext = Depends(get_tenant_context),
) -> DashboardSaveRequest:
    store = data_store.get_store(context.tenant_id)
    payload.id = dashboard_id
    return store.save_dashboard(payload)


@router.post(
    "/query/no-code",
    summary="Execute a no-code query",
    response_model=WidgetQueryResponse,
)
async def execute_no_code_query(
    query_spec: WidgetQueryRequest,
    context: TenantContext = Depends(get_tenant_context),
) -> WidgetQueryResponse:
    sample_rows: list[dict[str, Any]] = [
        {query_spec.groupBy: "Grupo A", query_spec.aggregateField: 42000},
        {query_spec.groupBy: "Grupo B", query_spec.aggregateField: 31000},
        {query_spec.groupBy: "Grupo C", query_spec.aggregateField: 18000},
    ]
    return WidgetQueryResponse(rows=sample_rows)


@router.get(
    "/widgets/target/{target_name}",
    summary="Get widgets for a specific target",
)
async def get_widgets_by_target(
    target_name: str,
    context: TenantContext = Depends(get_tenant_context),
) -> dict[str, list[dict[str, Any]]]:
    store = data_store.get_store(context.tenant_id)
    widgets: list[WidgetPayload] = store.list_widgets_for_target(target_name)
    return {"widgets": [widget.model_dump(by_alias=True) for widget in widgets]}
