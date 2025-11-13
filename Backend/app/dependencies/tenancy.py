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

