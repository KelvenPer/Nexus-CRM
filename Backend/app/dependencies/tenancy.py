from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.db.utils import set_tenant_search_path
from app.security.jwt_tenancy import validar_jwt_e_tenant


async def get_tenant_session(
    user: dict = Depends(validar_jwt_e_tenant),
    session: AsyncSession = Depends(get_session),
) -> AsyncSession:
    await set_tenant_search_path(session, user["schema_name"])
    return session


async def get_tenant_session_sqlsafe(
    user: dict = Depends(validar_jwt_e_tenant),
    session: AsyncSession = Depends(get_session),
) -> AsyncSession:
    """Tenant-scoped session restricted for SQL Studio.

    - search_path only to tenant schema (no tenant_admin)
    - set statement_timeout to 3s for safety
    """
    # Restrict search_path to tenant schema only
    await session.execute(
        __import__("sqlalchemy", fromlist=["text"]).text(
            "SELECT set_config('search_path', :path, true)"
        ),
        {"path": f"{user['schema_name']}"},
    )
    # Set a conservative statement_timeout (in ms)
    await session.execute(
        __import__("sqlalchemy", fromlist=["text"]).text(
            "SET LOCAL statement_timeout = :ms"
        ),
        {"ms": 3000},
    )
    return session
