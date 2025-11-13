"""Simple authentication / tenancy dependencies."""
from __future__ import annotations

from typing import List

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from app.core.config import settings


class TenantContext(BaseModel):
    tenant_id: str
    user_id: str
    roles: List[str]

    def has_role(self, role: str) -> bool:
        return role in self.roles


async def get_tenant_context(
    request: Request,
    x_tenant_id: str | None = Header(default=None, alias="X-Tenant-ID"),
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    x_user_roles: str | None = Header(default=None, alias="X-User-Roles"),
) -> TenantContext:
    """
    Simplified dependency to emulate an authenticated multi-tenant request.

    In production, this would decode a JWT. Here we rely on headers so the
    frontend can work without a full auth server.
    """

    # Preferir contexto preenchido pelo JWT (via validar_jwt_e_tenant)
    jwt_ctx = getattr(request.state, "nexus_context", None)

    if isinstance(jwt_ctx, dict) and jwt_ctx.get("tenant_id") and jwt_ctx.get("user_id"):
        tenant_id = str(jwt_ctx["tenant_id"])  # normalized
        user_id = str(jwt_ctx["user_id"])  # normalized
        roles = [str(r).lower() for r in (jwt_ctx.get("roles") or [])]
    else:
        tenant_id = x_tenant_id or settings.default_tenant_id
        user_id = x_user_id or settings.default_user_id
        roles_header = x_user_roles or settings.default_user_roles
        roles = [role.strip() for role in roles_header.split(",") if role.strip()]

    if not tenant_id or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing tenant or user context.",
        )

    return TenantContext(tenant_id=tenant_id, user_id=user_id, roles=roles)


def require_roles(*expected_roles: str):
    async def _checker(context: TenantContext = Depends(get_tenant_context)) -> TenantContext:
        if expected_roles and not any(context.has_role(role) for role in expected_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return context

    return _checker


def require_permission(action_key: str):
    async def _checker(
        context: TenantContext = Depends(get_tenant_context),
        session: AsyncSession = Depends(__import__("app.db.session", fromlist=["get_session"]).get_session),
    ) -> TenantContext:
        # Admin override shortcuts
        if any(r.lower() in {"admin", "data_admin"} for r in context.roles):
            return context

        roles = [r.lower() for r in context.roles]
        if not roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing roles.")

        schema = settings.tenant_admin_schema
        q = text(
            f"""
            SELECT 1
            FROM {schema}.roles r
            JOIN {schema}.role_permissions rp ON rp.role_id = r.role_id
            JOIN {schema}.permissions p ON p.permission_id = rp.permission_id
            WHERE lower(r.name) = ANY(:roles) AND p.action_key = :key
            LIMIT 1
            """
        )
        res = await session.execute(q, {"roles": roles, "key": action_key})
        if res.scalar() is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
        return context

    return _checker
