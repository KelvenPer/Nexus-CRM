from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_session
from app.core.security import TenantContext, get_tenant_context, require_permission
from app.core.config import settings
from app.models.admin_config import (
    ApiKeyCreate,
    ApiKeyResponse,
    BusinessHourCreate,
    BusinessHourResponse,
    CustomFieldCreate,
    CustomFieldResponse,
    CustomTableCreate,
    CustomTableResponse,
    NotificationServiceCreate,
    NotificationServiceResponse,
    NotificationTriggerCreate,
    NotificationTriggerResponse,
    PermissionCreate,
    PermissionResponse,
    RoleCreate,
    RolePermissionAssign,
    RoleResponse,
    SLAPolicyCreate,
    SLAPolicyResponse,
    TemplateCreate,
    TemplateResponse,
    TriggerChannelCreate,
    TriggerChannelResponse,
    WebhookCreate,
    WebhookResponse,
)
from app.services.admin_config_store import ensure_admin_config_schema, generate_api_key
from pydantic import BaseModel


router = APIRouter(dependencies=[Depends(require_permission("admin.config.manage"))])
ADMIN = settings.tenant_admin_schema


async def init(session: AsyncSession) -> None:
    await ensure_admin_config_schema(session)


def rows_to_list(result) -> list[dict[str, Any]]:
    return [dict(r) for r in result.mappings().all()]


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT role_id, name, description FROM {ADMIN}.roles ORDER BY name"))
    return rows_to_list(res)


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(payload: RoleCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(f"INSERT INTO {ADMIN}.roles (name, description) VALUES (:n, :d) RETURNING role_id, name, description"),
        {"n": payload.name, "d": payload.description},
    )
    return dict(res.mappings().first())


# ------------------------- Custom Data Store (CRUD) -------------------------


class DataRecordCreate(BaseModel):
    data: dict[str, Any]


class DataRecordResponse(BaseModel):
    record_id: str
    table_id: str
    data: dict[str, Any]
    created_at: Any | None = None
    updated_at: Any | None = None


async def _get_table_id(session: AsyncSession, table_name: str) -> str:
    res = await session.execute(text(f"SELECT table_id FROM {ADMIN}.custom_tables WHERE name = :n"), {"n": table_name})
    tid = res.scalar_one_or_none()
    if not tid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tabela nao encontrada")
    return str(tid)


async def _get_fields(session: AsyncSession, table_id: str) -> list[dict[str, Any]]:
    res = await session.execute(
        text(
            f"SELECT field_name, field_type, is_required FROM {ADMIN}.custom_fields WHERE table_id = :t ORDER BY field_name"
        ),
        {"t": table_id},
    )
    return rows_to_list(res)


def _validate_value(expected_type: str, value: Any) -> bool:
    t = expected_type.upper()
    if t == "TEXT":
        return isinstance(value, str)
    if t == "NUMBER":
        return isinstance(value, (int, float))
    if t == "BOOLEAN":
        return isinstance(value, bool)
    if t == "DATE":
        # aceitar string ISO
        return isinstance(value, str)
    if t == "RELATIONSHIP":
        # aceitar uuid/string
        return isinstance(value, str)
    return True


@router.post("/custom/data/{table_name}", response_model=DataRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    table_name: str,
    payload: DataRecordCreate,
    context: TenantContext = Depends(get_tenant_context),
    session: AsyncSession = Depends(get_session),
):
    await init(session)
    table_id = await _get_table_id(session, table_name)
    fields = await _get_fields(session, table_id)
    required = {f["field_name"]: f for f in fields if f.get("is_required")}
    for fname in required:
        if fname not in payload.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Campo obrigatorio ausente: {fname}")
    # validar tipos conhecidos
    types_map = {f["field_name"]: f["field_type"] for f in fields}
    for key, value in payload.data.items():
        if key in types_map and value is not None:
            if not _validate_value(types_map[key], value):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipo invalido para {key}. Esperado {types_map[key]}")
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.custom_data_store (table_id, record_data, created_by) VALUES (:t, :d, :u) RETURNING record_id, table_id, record_data AS data, created_at, updated_at"
        ),
        {"t": table_id, "d": payload.data, "u": context.user_id},
    )
    return dict(res.mappings().first())


@router.get("/custom/data/{table_name}", response_model=list[DataRecordResponse])
async def list_records(table_name: str, session: AsyncSession = Depends(get_session)):
    await init(session)
    table_id = await _get_table_id(session, table_name)
    res = await session.execute(
        text(
            f"SELECT record_id, table_id, record_data AS data, created_at, updated_at FROM {ADMIN}.custom_data_store WHERE table_id = :t ORDER BY created_at DESC LIMIT 100"
        ),
        {"t": table_id},
    )
    return rows_to_list(res)


@router.get("/custom/data/{table_name}/{record_id}", response_model=DataRecordResponse)
async def get_record(table_name: str, record_id: str, session: AsyncSession = Depends(get_session)):
    await init(session)
    table_id = await _get_table_id(session, table_name)
    res = await session.execute(
        text(
            f"SELECT record_id, table_id, record_data AS data, created_at, updated_at FROM {ADMIN}.custom_data_store WHERE table_id = :t AND record_id = :r"
        ),
        {"t": table_id, "r": record_id},
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro nao encontrado")
    return dict(row)


# ------------------------- Notificacoes (Teste SMTP) ------------------------


class TestEmailRequest(BaseModel):
    to: str
    subject: str
    html: str | None = None
    text: str | None = None


@router.post("/notification/test-email")
async def test_send_email(payload: TestEmailRequest, session: AsyncSession = Depends(get_session)):
    await init(session)
    # Carregar servico SMTP ativo
    res = await session.execute(
        text(f"SELECT credentials FROM {ADMIN}.notification_services WHERE type = 'SMTP' AND status = 'ACTIVE' LIMIT 1")
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Servico SMTP nao configurado/ativo")
    creds = row["credentials"] or {}

    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    host = creds.get("host")
    port = int(creds.get("port", 587))
    username = creds.get("username")
    password = creds.get("password")
    use_ssl = bool(creds.get("use_ssl", False))
    use_tls = bool(creds.get("use_tls", True))
    sender = creds.get("from", username)
    if not host or not sender:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciais SMTP incompletas")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = payload.subject
    msg["From"] = sender
    msg["To"] = payload.to
    if payload.text:
        msg.attach(MIMEText(payload.text, "plain", "utf-8"))
    if payload.html:
        msg.attach(MIMEText(payload.html, "html", "utf-8"))

    try:
        if use_ssl:
            with smtplib.SMTP_SSL(host=host, port=port) as server:
                if username and password:
                    server.login(username, password)
                server.sendmail(sender, [payload.to], msg.as_string())
        else:
            with smtplib.SMTP(host=host, port=port) as server:
                server.ehlo()
                if use_tls:
                    server.starttls()
                if username and password:
                    server.login(username, password)
                server.sendmail(sender, [payload.to], msg.as_string())
        return {"sent": True}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Falha ao enviar email: {e}")


# --------------------- Teste SMS / Push e Envio por Template ----------------


class TestSMSRequest(BaseModel):
    to: str
    message: str


@router.post("/notification/test-sms")
async def test_send_sms(payload: TestSMSRequest, session: AsyncSession = Depends(get_session)):
    await init(session)
    # Credenciais SMS genericas
    res = await session.execute(
        text(f"SELECT credentials FROM {ADMIN}.notification_services WHERE type IN ('SMS','SMS_TWILIO') AND status = 'ACTIVE' LIMIT 1")
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Servico SMS nao configurado/ativo")
    # Para MVP: apenas simula envio com sucesso
    return {"sent": True, "provider": "SMS", "to": payload.to, "preview": payload.message[:120]}


class TestPushRequest(BaseModel):
    to: str
    title: str
    body: str


@router.post("/notification/test-push")
async def test_send_push(payload: TestPushRequest, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(f"SELECT credentials FROM {ADMIN}.notification_services WHERE type IN ('PUSH','PUSH_FIREBASE') AND status = 'ACTIVE' LIMIT 1")
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Servico Push nao configurado/ativo")
    # MVP: simula envio
    return {"sent": True, "provider": "PUSH", "to": payload.to, "title": payload.title}


def _render_template(content: str, variables: dict[str, Any]) -> str:
    # Substituicao simples de {{a.b}} por variavel no dict (MVP seguro)
    import re

    def resolve(path: str):
        cur: Any = variables
        for part in path.split('.'):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                return ''
        return str(cur)

    def repl(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        return resolve(key)

    return re.sub(r"\{\{\s*([^}]+)\s*\}\}", repl, content)


class SendTemplateRequest(BaseModel):
    template_id: str
    channel: str  # EMAIL | SMS | PUSH
    to: str
    variables: dict[str, Any] = {}


@router.post("/notification/send-template")
async def send_template(payload: SendTemplateRequest, session: AsyncSession = Depends(get_session)):
    await init(session)
    # Carregar template
    t_res = await session.execute(
        text(f"SELECT name, type, subject, content FROM {ADMIN}.templates WHERE template_id = :id"),
        {"id": payload.template_id},
    )
    t_row = t_res.mappings().first()
    if not t_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template nao encontrado")

    subject = t_row["subject"] or t_row["name"]
    content = _render_template(t_row["content"], payload.variables or {})

    channel = payload.channel.upper()
    if channel == "EMAIL":
        # Reutiliza teste SMTP
        return await test_send_email(TestEmailRequest(to=payload.to, subject=subject, html=content), session)  # type: ignore[arg-type]
    if channel == "SMS":
        return await test_send_sms(TestSMSRequest(to=payload.to, message=content[:140]), session)  # type: ignore[arg-type]
    if channel == "PUSH":
        return await test_send_push(TestPushRequest(to=payload.to, title=subject, body=content[:180]), session)  # type: ignore[arg-type]
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Canal invalido")



@router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(f"SELECT permission_id, action_key, description FROM {ADMIN}.permissions ORDER BY action_key")
    )
    return rows_to_list(res)


@router.post("/permissions", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_permission(payload: PermissionCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.permissions (action_key, description) VALUES (:k, :d) RETURNING permission_id, action_key, description"
        ),
        {"k": payload.action_key, "d": payload.description},
    )
    return dict(res.mappings().first())


# -------------------------- User ↔ Roles (DB) ------------------------------


class UserRoleAssign(BaseModel):
    user_id: str
    role_id: str


@router.post("/roles/assign-user", status_code=status.HTTP_201_CREATED)
async def assign_user_role(payload: UserRoleAssign, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(
        text(f"INSERT INTO {ADMIN}.user_roles (user_id, role_id) VALUES (:u, :r) ON CONFLICT DO NOTHING"),
        {"u": payload.user_id, "r": payload.role_id},
    )
    return {"ok": True}


@router.delete("/roles/assign-user", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_user_role(payload: UserRoleAssign, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(
        text(f"DELETE FROM {ADMIN}.user_roles WHERE user_id = :u AND role_id = :r"),
        {"u": payload.user_id, "r": payload.role_id},
    )
    return {"ok": True}


@router.get("/roles/by-user/{user_id}")
async def list_user_roles(user_id: str, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"SELECT r.role_id, r.name, r.description FROM {ADMIN}.user_roles ur JOIN {ADMIN}.roles r ON r.role_id = ur.role_id WHERE ur.user_id = :u ORDER BY r.name"
        ),
        {"u": user_id},
    )
    return rows_to_list(res)


# ----------------------------- Hierarquias -------------------------------


class HierarchyLevel(BaseModel):
    name: str
    position: int


class HierarchyUpsert(BaseModel):
    type: str  # PDV | COMERCIAL | PRODUTO
    levels: list[HierarchyLevel]
    items: list[dict[str, Any]]  # { name, parent_id? }


@router.get("/hierarchies/pdv")
async def get_hierarchy_pdv(session: AsyncSession = Depends(get_session)):
    await init(session)
    res_levels = await session.execute(
        text(f"SELECT level_id, name, position FROM {ADMIN}.hierarchy_levels WHERE type = 'PDV' ORDER BY position")
    )
    res_items = await session.execute(
        text(f"SELECT structure_id, name, parent_id FROM {ADMIN}.hierarchy_structure WHERE type = 'PDV'")
    )
    return {"levels": rows_to_list(res_levels), "items": rows_to_list(res_items)}


@router.put("/hierarchies/pdv")
async def put_hierarchy_pdv(payload: HierarchyUpsert, session: AsyncSession = Depends(get_session)):
    await init(session)
    if payload.type.upper() != "PDV":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Type invalido")
    await session.execute(text(f"DELETE FROM {ADMIN}.hierarchy_levels WHERE type = 'PDV'"))
    await session.execute(text(f"DELETE FROM {ADMIN}.hierarchy_structure WHERE type = 'PDV'"))
    for lvl in sorted(payload.levels, key=lambda x: x.position):
        await session.execute(
            text(f"INSERT INTO {ADMIN}.hierarchy_levels (type, name, position) VALUES ('PDV', :n, :p)"),
            {"n": lvl.name, "p": lvl.position},
        )
    # Primeiro pass: inserir itens sem parent
    id_map: dict[str, str] = {}
    for it in payload.items:
        if not it.get("parent_id"):
            r = await session.execute(
                text(f"INSERT INTO {ADMIN}.hierarchy_structure (type, name) VALUES ('PDV', :n) RETURNING structure_id"),
                {"n": it.get("name", "")},
            )
            id_map[it.get("name", str(len(id_map)))] = str(r.scalar())
    # Segundo pass: inserir com parent
    for it in payload.items:
        if it.get("parent_id"):
            parent = id_map.get(it.get("parent_id")) or it.get("parent_id")
            await session.execute(
                text(f"INSERT INTO {ADMIN}.hierarchy_structure (type, name, parent_id) VALUES ('PDV', :n, :p)"),
                {"n": it.get("name", ""), "p": parent},
            )
    return {"ok": True}


# ----------------------------- Workflows ---------------------------------


class WorkflowSave(BaseModel):
    name: str
    model: dict[str, Any]
    status: str | None = None


@router.get("/workflows")
async def list_workflows(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT workflow_id, name, model, status, updated_at FROM {ADMIN}.workflows ORDER BY updated_at DESC"))
    return rows_to_list(res)


@router.put("/workflows/{workflow_id}")
async def upsert_workflow(workflow_id: str, payload: WorkflowSave, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(
        text(
            f"INSERT INTO {ADMIN}.workflows (workflow_id, name, model, status, updated_at) VALUES (:id, :n, :m, COALESCE(:s,'ACTIVE'), NOW()) "
            f"ON CONFLICT (workflow_id) DO UPDATE SET name = EXCLUDED.name, model = EXCLUDED.model, status = COALESCE(:s, {ADMIN}.workflows.status), updated_at = NOW()"
        ),
        {"id": workflow_id, "n": payload.name, "m": payload.model, "s": payload.status},
    )
    res = await session.execute(text(f"SELECT workflow_id, name, model, status, updated_at FROM {ADMIN}.workflows WHERE workflow_id = :id"), {"id": workflow_id})
    return dict(res.mappings().first())


# ------------------------------ Finance ----------------------------------


class BudgetTypesSave(BaseModel):
    types: list[str]


@router.put("/finance/budget-types")
async def put_budget_types(payload: BudgetTypesSave, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(text(f"DELETE FROM {ADMIN}.finance_budget_types"))
    for name in payload.types:
        await session.execute(text(f"INSERT INTO {ADMIN}.finance_budget_types (name) VALUES (:n) ON CONFLICT DO NOTHING"), {"n": name})
    return {"ok": True}


class FinanceRulesSave(BaseModel):
    rules: list[dict[str, Any]]


@router.put("/finance/reconciliation-rules")
async def put_finance_rules(payload: FinanceRulesSave, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(text(f"DELETE FROM {ADMIN}.finance_rules"))
    for rule in payload.rules:
        await session.execute(text(f"INSERT INTO {ADMIN}.finance_rules (name, value) VALUES (:n, :v)"), {"n": rule.get("name", ""), "v": str(rule.get("value", ""))})
    return {"ok": True}


# ------------------------------- Logs ------------------------------------


@router.get("/logs")
async def list_logs(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT log_id, user_id, timestamp, action, entity_type, entity_id, details FROM {ADMIN}.audit_log ORDER BY timestamp DESC LIMIT 200"))
    return rows_to_list(res)


# --------------------------- Data Tables alias ----------------------------


@router.get("/data/tables")
async def get_data_tables(session: AsyncSession = Depends(get_session)):
    await init(session)
    # Custom tables
    res_c = await session.execute(text(f"SELECT table_id, name, description FROM {ADMIN}.custom_tables ORDER BY name"))
    customs = rows_to_list(res_c)
    # System tables (stub)
    systems = [
        {"id": "tb_oportunidade", "name": "tb_oportunidade", "description": "Oportunidades"},
        {"id": "tb_contato", "name": "tb_contato", "description": "Contatos"},
    ]
    return {"custom": customs, "system": systems}


@router.post("/role-permissions", status_code=status.HTTP_201_CREATED)
async def assign_role_permission(payload: RolePermissionAssign, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(
        text(f"INSERT INTO {ADMIN}.role_permissions (role_id, permission_id) VALUES (:r, :p) ON CONFLICT DO NOTHING"),
        {"r": payload.role_id, "p": payload.permission_id},
    )
    return {"ok": True}


@router.post("/api-keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(payload: ApiKeyCreate, context: TenantContext = Depends(get_tenant_context), session: AsyncSession = Depends(get_session)):
    await init(session)
    raw, prefix = await generate_api_key(session, context.user_id, payload.description)
    res = await session.execute(
        text(f"SELECT key_id, prefix, description, status, last_used_at FROM {ADMIN}.api_keys WHERE prefix = :p ORDER BY key_id DESC LIMIT 1"),
        {"p": prefix},
    )
    row = dict(res.mappings().first())
    row["prefix"] = prefix
    # Por seguranca, so retornamos prefix; a chave completa foi gerada no server (log/local). Em producao enviariamos uma unica vez.
    return row


@router.get("/webhooks", response_model=list[WebhookResponse])
async def list_webhooks(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT webhook_id, event_name, target_url, secret_key, status FROM {ADMIN}.webhooks ORDER BY event_name"))
    return rows_to_list(res)


@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(payload: WebhookCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.webhooks (event_name, target_url, secret_key) VALUES (:e, :u, :s) RETURNING webhook_id, event_name, target_url, secret_key, status"
        ),
        {"e": payload.event_name, "u": payload.target_url, "s": payload.secret_key},
    )
    return dict(res.mappings().first())


@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT template_id, name, type, subject, content, created_at, updated_at FROM {ADMIN}.templates ORDER BY name"))
    return rows_to_list(res)


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(payload: TemplateCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.templates (name, type, subject, content) VALUES (:n, :t, :s, :c) RETURNING template_id, name, type, subject, content, created_at, updated_at"
        ),
        {"n": payload.name, "t": payload.type, "s": payload.subject, "c": payload.content},
    )
    return dict(res.mappings().first())


@router.get("/notification/services", response_model=list[NotificationServiceResponse])
async def list_notification_services(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT service_id, type, credentials, status FROM {ADMIN}.notification_services ORDER BY type"))
    return rows_to_list(res)


@router.post("/notification/services", response_model=NotificationServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_service(payload: NotificationServiceCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.notification_services (type, credentials) VALUES (:t, :c) RETURNING service_id, type, credentials, status"
        ),
        {"t": payload.type, "c": payload.credentials},
    )
    return dict(res.mappings().first())


@router.get("/notification/triggers", response_model=list[NotificationTriggerResponse])
async def list_triggers(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT trigger_id, event_name, template_id, description FROM {ADMIN}.notification_triggers ORDER BY event_name"))
    return rows_to_list(res)


@router.post("/notification/triggers", response_model=NotificationTriggerResponse, status_code=status.HTTP_201_CREATED)
async def create_trigger(payload: NotificationTriggerCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.notification_triggers (event_name, template_id, description) VALUES (:e, :t, :d) RETURNING trigger_id, event_name, template_id, description"
        ),
        {"e": payload.event_name, "t": payload.template_id, "d": payload.description},
    )
    return dict(res.mappings().first())


@router.post("/notification/trigger-channels", response_model=TriggerChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_trigger_channel(payload: TriggerChannelCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.trigger_channels (trigger_id, channel) VALUES (:i, :c) RETURNING trigger_channel_id, trigger_id, channel, status"
        ),
        {"i": payload.trigger_id, "c": payload.channel},
    )
    return dict(res.mappings().first())


@router.get("/sla/policies", response_model=list[SLAPolicyResponse])
async def list_sla_policies(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT policy_id, priority, first_response_time_minutes, solution_time_minutes FROM {ADMIN}.sla_policies ORDER BY priority"))
    return rows_to_list(res)


@router.post("/sla/policies", response_model=SLAPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_sla_policy(payload: SLAPolicyCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.sla_policies (priority, first_response_time_minutes, solution_time_minutes) VALUES (:p, :f, :s) RETURNING policy_id, priority, first_response_time_minutes, solution_time_minutes"
        ),
        {"p": payload.priority, "f": payload.first_response_time_minutes, "s": payload.solution_time_minutes},
    )
    return dict(res.mappings().first())


@router.get("/sla/business-hours", response_model=list[BusinessHourResponse])
async def list_business_hours(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT id, day_of_week, start_time, end_time FROM {ADMIN}.business_hours ORDER BY day_of_week"))
    return rows_to_list(res)


@router.post("/sla/business-hours", response_model=BusinessHourResponse, status_code=status.HTTP_201_CREATED)
async def create_business_hour(payload: BusinessHourCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.business_hours (day_of_week, start_time, end_time) VALUES (:d, :s, :e) RETURNING id, day_of_week, start_time, end_time"
        ),
        {"d": payload.day_of_week, "s": payload.start_time, "e": payload.end_time},
    )
    return dict(res.mappings().first())


@router.get("/custom/tables", response_model=list[CustomTableResponse])
async def list_custom_tables(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT table_id, name, description FROM {ADMIN}.custom_tables ORDER BY name"))
    return rows_to_list(res)


@router.post("/custom/tables", response_model=CustomTableResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_table(payload: CustomTableCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(f"INSERT INTO {ADMIN}.custom_tables (name, description) VALUES (:n, :d) RETURNING table_id, name, description"),
        {"n": payload.name, "d": payload.description},
    )
    return dict(res.mappings().first())


@router.get("/custom/fields", response_model=list[CustomFieldResponse])
async def list_custom_fields(table_id: str, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"SELECT field_id, table_id, field_name, field_type, is_required FROM {ADMIN}.custom_fields WHERE table_id = :t ORDER BY field_name"
        ),
        {"t": table_id},
    )
    return rows_to_list(res)


@router.post("/custom/fields", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_field(payload: CustomFieldCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.custom_fields (table_id, field_name, field_type, is_required) VALUES (:t, :n, :ft, :r) RETURNING field_id, table_id, field_name, field_type, is_required"
        ),
        {"t": payload.table_id, "n": payload.field_name, "ft": payload.field_type, "r": payload.is_required},
    )
    return dict(res.mappings().first())

# ---- Additional UI-friendly endpoints (composite/adapters) ----

@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: str, payload: TemplateCreate, session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"UPDATE {ADMIN}.templates SET name = COALESCE(:n,name), type = COALESCE(:t,type), subject = COALESCE(:s,subject), content = COALESCE(:c,content), updated_at = NOW() WHERE template_id = :id RETURNING template_id, name, type, subject, content, created_at, updated_at"
        ),
        {"id": template_id, "n": payload.name, "t": payload.type, "s": payload.subject, "c": payload.content},
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template nao encontrado")
    return dict(row)


@router.put("/notification/services/{service_type}")
async def upsert_notification_service(service_type: str, payload: dict[str, Any], session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(
        text(
            f"INSERT INTO {ADMIN}.notification_services (type, credentials, status) VALUES (:t, :c, 'ACTIVE') ON CONFLICT (type) DO UPDATE SET credentials = EXCLUDED.credentials, status = 'ACTIVE' RETURNING service_id, type, credentials, status"
        ),
        {"t": service_type.upper(), "c": payload},
    )
    return dict(res.mappings().first())


@router.patch("/notifications/triggers/{trigger_id}")
async def update_trigger_channels(trigger_id: str, payload: dict[str, Any], session: AsyncSession = Depends(get_session)):
    await init(session)
    channels = {k.upper(): bool(v) for k, v in payload.items() if k in {"email", "sms", "push"}}
    await session.execute(text(f"DELETE FROM {ADMIN}.trigger_channels WHERE trigger_id = :i"), {"i": trigger_id})
    for ch, enabled in channels.items():
        if enabled:
            await session.execute(
                text(f"INSERT INTO {ADMIN}.trigger_channels (trigger_id, channel, status) VALUES (:i, :c, 'ACTIVE')"),
                {"i": trigger_id, "c": ch},
            )
    return {"ok": True}


@router.get("/sla")
async def get_sla(session: AsyncSession = Depends(get_session)):
    await init(session)
    res_h = await session.execute(text(f"SELECT day_of_week, start_time, end_time FROM {ADMIN}.business_hours ORDER BY day_of_week"))
    hours = rows_to_list(res_h)
    start = (hours[0]["start_time"].strftime("%H:%M") if hours else "08:00")
    end = (hours[0]["end_time"].strftime("%H:%M") if hours else "18:00")
    res_p = await session.execute(text(f"SELECT priority, first_response_time_minutes, solution_time_minutes FROM {ADMIN}.sla_policies"))
    rules = []
    for r in rows_to_list(res_p):
        pr = r["priority"].lower()
        label = "Alta" if pr.startswith("high") or pr.startswith("alta") else ("Media" if pr.startswith("med") else "Baixa")
        rules.append({
            "priority": label,
            "responseTime": r["first_response_time_minutes"] or 0,
            "responseUnit": "min",
            "resolutionTime": r["solution_time_minutes"] or 0,
            "resolutionUnit": "min",
        })
    return {"workingHours": {"start": start, "end": end, "weekDays": True}, "rules": rules}


class SlaUpdate(BaseModel):
    workingHours: dict
    rules: list[dict]


@router.put("/sla")
async def put_sla(payload: SlaUpdate, session: AsyncSession = Depends(get_session)):
    await init(session)
    start = payload.workingHours.get("start", "08:00")
    end = payload.workingHours.get("end", "18:00")
    await session.execute(text(f"DELETE FROM {ADMIN}.business_hours"))
    for dow in [1, 2, 3, 4, 5]:
        await session.execute(
            text(f"INSERT INTO {ADMIN}.business_hours (day_of_week, start_time, end_time) VALUES (:d, :s, :e)"),
            {"d": dow, "s": start, "e": end},
        )
    await session.execute(text(f"DELETE FROM {ADMIN}.sla_policies"))
    for rule in payload.rules:
        pr = rule.get("priority", "Media")
        norm = "HIGH" if str(pr).lower().startswith("alta") else ("LOW" if str(pr).lower().startswith("baixa") else "MEDIUM")
        await session.execute(
            text(f"INSERT INTO {ADMIN}.sla_policies (priority, first_response_time_minutes, solution_time_minutes) VALUES (:p, :fr, :sl)"),
            {"p": norm, "fr": int(rule.get("responseTime", 0)), "sl": int(rule.get("resolutionTime", 0))},
        )
    return {"ok": True}


@router.get("/api-keys")
async def list_api_keys(session: AsyncSession = Depends(get_session)):
    await init(session)
    res = await session.execute(text(f"SELECT key_id, prefix, description, status, last_used_at FROM {ADMIN}.api_keys ORDER BY last_used_at NULLS LAST"))
    return rows_to_list(res)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(key_id: str, session: AsyncSession = Depends(get_session)):
    await init(session)
    await session.execute(text(f"UPDATE {ADMIN}.api_keys SET status = 'REVOKED' WHERE key_id = :id"), {"id": key_id})
    return {"ok": True}


class WebhookUpdate(BaseModel):
    active: bool


@router.patch("/webhooks/{webhook_id}")
async def update_webhook(webhook_id: str, payload: WebhookUpdate, session: AsyncSession = Depends(get_session)):
    await init(session)
    status_val = 'ACTIVE' if payload.active else 'INACTIVE'
    await session.execute(text(f"UPDATE {ADMIN}.webhooks SET status = :s WHERE webhook_id = :id"), {"s": status_val, "id": webhook_id})
    return {"ok": True}
