from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_tenant_search_path(session: AsyncSession, tenant_schema: str) -> None:
    """Set search_path for the current transaction to the tenant schema and tenant_admin.

    Use at the beginning of a request-bound transaction.
    """
    # Postgres nao aceita bind parameters em SET LOCAL search_path.
    # Usamos set_config com is_local=True para efeito transacional e parametro seguro.
    await session.execute(
        text("SELECT set_config('search_path', :path, true)"),
        {"path": f"{tenant_schema}, tenant_admin"},
    )
