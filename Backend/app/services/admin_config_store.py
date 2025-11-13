from __future__ import annotations

import hashlib
import os
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


TENANT_ADMIN = settings.tenant_admin_schema


CREATE_STATEMENTS: list[str] = [
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.roles (
        role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.permissions (
        permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_key VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.role_permissions (
        role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.roles(role_id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.permissions(permission_id) ON DELETE CASCADE,
        UNIQUE(role_id, permission_id)
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.api_keys (
        key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        key_hash VARCHAR(255) NOT NULL,
        prefix VARCHAR(10) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        last_used_at TIMESTAMP
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.webhooks (
        webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(100) NOT NULL,
        target_url TEXT NOT NULL,
        secret_key TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.templates (
        template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.notification_services (
        service_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL UNIQUE,
        credentials JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'INACTIVE'
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.notification_triggers (
        trigger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name VARCHAR(100) NOT NULL,
        template_id UUID REFERENCES {TENANT_ADMIN}.templates(template_id) ON DELETE SET NULL,
        description TEXT
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.trigger_channels (
        trigger_channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trigger_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.notification_triggers(trigger_id) ON DELETE CASCADE,
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.sla_policies (
        policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        priority VARCHAR(50) NOT NULL UNIQUE,
        first_response_time_minutes INT,
        solution_time_minutes INT
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.business_hours (
        id SERIAL PRIMARY KEY,
        day_of_week INT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.custom_tables (
        table_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.custom_fields (
        field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.custom_tables(table_id) ON DELETE CASCADE,
        field_name VARCHAR(100) NOT NULL,
        field_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT FALSE
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.custom_data_store (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.custom_tables(table_id) ON DELETE CASCADE,
        record_data JSONB NOT NULL,
        created_by UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.tb_usuario(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES {TENANT_ADMIN}.roles(role_id) ON DELETE CASCADE,
        UNIQUE(user_id, role_id)
    )
    """,
    # Hierarquias ----------------------------------------------------
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.hierarchy_levels (
        level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        position INT DEFAULT 0
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.hierarchy_structure (
        structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        parent_id UUID NULL REFERENCES {TENANT_ADMIN}.hierarchy_structure(structure_id) ON DELETE SET NULL
    )
    """,
    # Workflows ------------------------------------------------------
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.workflows (
        workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        model JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        updated_at TIMESTAMP DEFAULT NOW()
    )
    """,
    # Finance --------------------------------------------------------
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.finance_budget_types (
        type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL UNIQUE
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.finance_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL UNIQUE,
        value TEXT
    )
    """,
    # Audit Log ------------------------------------------------------
    f"""
    CREATE TABLE IF NOT EXISTS {TENANT_ADMIN}.audit_log (
        log_id BIGSERIAL PRIMARY KEY,
        user_id UUID,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        details JSONB
    )
    """,
]


async def ensure_admin_config_schema(session: AsyncSession) -> None:
    for stmt in CREATE_STATEMENTS:
        await session.execute(text(stmt))


def _hash_api_key(raw: str) -> tuple[str, str]:
    prefix = raw[:8]
    return hashlib.sha256(raw.encode()).hexdigest(), prefix


async def generate_api_key(session: AsyncSession, user_id: str | None, description: str | None) -> tuple[str, str]:
    raw = "nex_" + os.urandom(24).hex()
    key_hash, prefix = _hash_api_key(raw)
    await session.execute(
        text(
            f"INSERT INTO {TENANT_ADMIN}.api_keys (user_id, key_hash, prefix, description) VALUES (:u, :h, :p, :d)"
        ),
        {"u": user_id, "h": key_hash, "p": prefix, "d": description},
    )
    return raw, prefix
