from __future__ import annotations

from datetime import datetime, time
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# RBAC --------------------------------------------------------------


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None


class RoleResponse(RoleCreate):
    role_id: str


class PermissionCreate(BaseModel):
    action_key: str
    description: Optional[str] = None


class PermissionResponse(PermissionCreate):
    permission_id: str


class RolePermissionAssign(BaseModel):
    role_id: str
    permission_id: str


# Integrations / Webhooks ------------------------------------------


class ApiKeyCreate(BaseModel):
    description: Optional[str] = None


class ApiKeyResponse(BaseModel):
    key_id: str
    prefix: str
    description: Optional[str] = None
    status: str
    last_used_at: Optional[datetime] = None


class WebhookCreate(BaseModel):
    event_name: str
    target_url: str
    secret_key: Optional[str] = None


class WebhookResponse(WebhookCreate):
    webhook_id: str
    status: str


# Templates / Notifications ----------------------------------------


class TemplateCreate(BaseModel):
    name: str
    type: str
    subject: Optional[str] = None
    content: str


class TemplateResponse(TemplateCreate):
    template_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class NotificationServiceCreate(BaseModel):
    type: str
    credentials: dict[str, Any]


class NotificationServiceResponse(NotificationServiceCreate):
    service_id: str
    status: str


class NotificationTriggerCreate(BaseModel):
    event_name: str
    template_id: str
    description: Optional[str] = None


class NotificationTriggerResponse(NotificationTriggerCreate):
    trigger_id: str


class TriggerChannelCreate(BaseModel):
    trigger_id: str
    channel: str


class TriggerChannelResponse(TriggerChannelCreate):
    trigger_channel_id: str
    status: str


# SLA ---------------------------------------------------------------


class SLAPolicyCreate(BaseModel):
    priority: str
    first_response_time_minutes: Optional[int] = None
    solution_time_minutes: Optional[int] = None


class SLAPolicyResponse(SLAPolicyCreate):
    policy_id: str


class BusinessHourCreate(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time


class BusinessHourResponse(BusinessHourCreate):
    id: int


# Custom tables -----------------------------------------------------


class CustomTableCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CustomTableResponse(CustomTableCreate):
    table_id: str


class CustomFieldCreate(BaseModel):
    table_id: str
    field_name: str
    field_type: str
    is_required: bool = False


class CustomFieldResponse(CustomFieldCreate):
    field_id: str

