"""
Provision a new tenant schema by cloning from template_schema and registering it in tenant_admin.

Usage (PowerShell):
  cd Backend
  .\.venv\Scripts\Activate.ps1  # or activate your venv
  python -m app.ops.provision_tenant --company "Nexus CRM HQ (Admin)" --schema tenant_nexus_hq --admin-email admin@nexuscrm.com --password your_password_hash

Notes:
- Assumes you already ran the SQL in docs/sql: 01_enable_extensions.sql, 02_create_schemas.sql, 03_tenant_admin_tables.sql, 04_template_schema_tables.sql, 05_clone_from_template.sql
- Password should be a precomputed hash; integrate with your auth later.
"""
from __future__ import annotations

import argparse
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings


async def clone_schema(session: AsyncSession, schema_name: str) -> None:
    await session.execute(text("SELECT tenant_admin.clone_from_template(:schema)"), {"schema": schema_name})


async def register_tenant(
    session: AsyncSession, company: str, schema_name: str
) -> str:
    result = await session.execute(
        text(
            """
            INSERT INTO tenant_admin.tb_tenant (nome_empresa, schema_name)
            VALUES (:company, :schema)
            RETURNING id
            """
        ),
        {"company": company, "schema": schema_name},
    )
    tenant_id = result.scalar_one()
    return str(tenant_id)


async def create_admin_user(
    session: AsyncSession,
    tenant_id: str,
    email: str,
    password_hash: str,
) -> str:
    result = await session.execute(
        text(
            """
            INSERT INTO tenant_admin.tb_usuario (tenant_id, email, senha_hash, perfil)
            VALUES (:tenant_id, :email, :senha_hash, 'SUPER_ADMIN')
            RETURNING id
            """
        ),
        {"tenant_id": tenant_id, "email": email, "senha_hash": password_hash},
    )
    user_id = result.scalar_one()
    return str(user_id)


async def main(company: str, schema: str, admin_email: Optional[str], password_hash: Optional[str]) -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        session = AsyncSession(bind=conn)
        # Clone schema first (idempotent for tables that exist)
        await clone_schema(session, schema)
        # Register tenant
        tenant_id = await register_tenant(session, company, schema)
        admin_user_id = None
        if admin_email and password_hash:
            admin_user_id = await create_admin_user(session, tenant_id, admin_email, password_hash)
        await session.commit()
        print(
            {
                "tenant_id": tenant_id,
                "schema": schema,
                "admin_user_id": admin_user_id,
            }
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision a new tenant schema from template_schema")
    parser.add_argument("--company", required=True, help="Company name")
    parser.add_argument("--schema", required=True, help="New tenant schema name (e.g., tenant_nexus_hq)")
    parser.add_argument("--admin-email", required=False, help="Optional admin email to create as SUPER_ADMIN")
    parser.add_argument(
        "--password", required=False, help="Password hash for admin (store a pre-hash here)"
    )
    parser.add_argument(
        "--password-plain", required=False, help="Plain password for admin (will be hashed with bcrypt)"
    )
    args = parser.parse_args()

    import asyncio
    from passlib.context import CryptContext

    password_hash = args.password
    if not password_hash and args.password_plain:
        ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = ctx.hash(args.password_plain)

    asyncio.run(main(args.company, args.schema, args.admin_email, password_hash))
