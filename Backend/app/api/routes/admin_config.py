from __future__ import annotations

"""Minimal admin config API used by the frontend.

This module intentionally keeps all data in-memory or returns empty structures,
acting as a non-breaking stub while the real admin/config backend is designed.
"""

from fastapi import APIRouter, status


router = APIRouter()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users")
async def list_users() -> list[dict]:
  return []


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user() -> dict:
  return {"id": "user_demo", "nome": "Admin Demo", "email": "admin@example.com", "role": "Administrador", "status": "Ativo"}


@router.put("/users/{user_id}")
async def update_user(user_id: str) -> dict:
  return {"id": user_id, "nome": "Admin Demo", "email": "admin@example.com", "role": "Administrador", "status": "Ativo"}


@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str) -> dict:
  return {"id": user_id, "status": "Ativo"}


# ---------------------------------------------------------------------------
# Roles & permissions
# ---------------------------------------------------------------------------


@router.get("/roles")
async def list_role_groups() -> list[dict]:
  return [
    {"id": "admin", "name": "Administradores", "description": "Acesso total ao console", "editable": False},
    {"id": "trade_manager", "name": "Gestores de Trade", "description": "Gestão de contratos e provas", "editable": True},
  ]


@router.get("/roles/modules")
async def list_permission_modules() -> list[dict]:
  return [
    {
      "id": "trade",
      "name": "Trade Marketing",
      "toggles": [
        {"id": "view_contracts", "label": "Ver contratos"},
        {"id": "manage_proofs", "label": "Gerenciar comprovações"},
      ],
    },
    {
      "id": "data",
      "name": "Área de Dados",
      "toggles": [
        {"id": "view_sql_studio", "label": "Acessar Estúdio SQL"},
        {"id": "publish_objects", "label": "Publicar objetos"},
      ],
    },
  ]


@router.get("/roles/permissions")
async def list_role_permissions() -> dict:
  return {
    "admin": ["view_contracts", "manage_proofs", "view_sql_studio", "publish_objects"],
    "trade_manager": ["view_contracts", "manage_proofs"],
  }


@router.post("/roles/{role_id}/permissions")
async def grant_permission(role_id: str) -> dict:
  return {"role": role_id, "status": "granted"}


@router.delete("/roles/{role_id}/permissions")
async def revoke_permission(role_id: str) -> dict:
  return {"role": role_id, "status": "revoked"}


# ---------------------------------------------------------------------------
# Modules & visibility
# ---------------------------------------------------------------------------


@router.get("/modules")
async def list_modules() -> list[dict]:
  return [
    {"id": "mod_trade", "label": "Trade Marketing", "enabled": True, "description": "Módulo de Trade & provas"},
    {"id": "mod_data", "label": "Área de Dados", "enabled": True, "description": "Estúdio SQL e BI"},
  ]


@router.patch("/modules/{module_id}")
async def update_module(module_id: str) -> dict:
  return {"id": module_id, "status": "updated"}


@router.get("/jbp/visibility")
async def get_jbp_visibility() -> dict:
  return {}


@router.put("/jbp/visibility")
async def update_jbp_visibility() -> dict:
  return {"status": "updated"}


# ---------------------------------------------------------------------------
# Custom / system tables
# ---------------------------------------------------------------------------


@router.get("/custom/tables")
async def list_custom_tables() -> list[dict]:
  return []


@router.post("/custom/tables", status_code=status.HTTP_201_CREATED)
async def create_custom_table() -> dict:
  return {"id": "custom_table_demo", "name": "tabela_custom_demo"}


@router.get("/system-tables")
async def list_system_tables() -> list[dict]:
  return [
    {"id": "tenant_admin.tb_tenant", "name": "tb_tenant", "description": "Tenants cadastrados"},
    {"id": "tenant_admin.tb_usuario", "name": "tb_usuario", "description": "Usuários do console"},
  ]


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


@router.get("/templates")
async def list_templates() -> list[dict]:
  return []


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def create_template() -> dict:
  return {"id": "template_demo", "name": "Template Demo", "type": "email", "content": "", "variables": []}


@router.put("/templates/{template_id}")
async def update_template(template_id: str) -> dict:
  return {"id": template_id, "status": "updated"}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


@router.get("/notification/triggers")
async def list_notification_triggers() -> list[dict]:
  return []


@router.get("/notification/services")
async def list_notification_services() -> list[dict]:
  return []


@router.patch("/notifications/triggers/{trigger_id}")
async def update_notification_trigger(trigger_id: str) -> dict:
  return {"id": trigger_id, "status": "updated"}


@router.put("/notification/services/{provider_type}")
async def update_notification_service(provider_type: str) -> dict:
  return {"type": provider_type, "status": "updated"}


# ---------------------------------------------------------------------------
# SLA
# ---------------------------------------------------------------------------


@router.get("/sla")
async def get_sla() -> dict:
  return {
    "workingHours": {"start": "08:00", "end": "18:00", "weekDays": True},
    "rules": [],
  }


@router.put("/sla")
async def update_sla() -> dict:
  return {"status": "updated"}


# ---------------------------------------------------------------------------
# Integrations: API keys & webhooks
# ---------------------------------------------------------------------------


@router.get("/api-keys")
async def list_api_keys() -> list[dict]:
  return []


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key() -> dict:
  return {"id": "key_demo", "label": "API Key Demo", "mask": "demo...", "createdAt": ""}


@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str) -> dict:
  return {"id": key_id, "status": "revoked"}


@router.get("/webhooks")
async def list_webhooks() -> list[dict]:
  return []


@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
async def create_webhook() -> dict:
  return {"id": "webhook_demo", "event": "demo", "url": "https://example.com", "active": True}


@router.patch("/webhooks/{webhook_id}")
async def update_webhook(webhook_id: str) -> dict:
  return {"id": webhook_id, "status": "updated"}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


@router.get("/audit-log")
async def list_audit_log() -> list[dict]:
  return []

