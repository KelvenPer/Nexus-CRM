"""JWT authentication and tenant search_path dependency."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.db.utils import set_tenant_search_path


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_minutes: Optional[int] = None) -> str:
    # Ensure JWT claims are JSON-serializable (e.g., UUID -> str)
    to_encode = {
        k: (str(v) if isinstance(v, UUID) else v)
        for k, v in data.copy().items()
    }
    expire = datetime.now(tz=timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expires_minutes
    )
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[Dict[str, Any]]:
    """Fetch user and tenant info by email from tenant_admin schema."""
    q = text(
        """
        SELECT u.id AS user_id,
               u.email,
               u.senha_hash,
               u.perfil,
               u.tenant_id,
               t.schema_name,
               t.nome_empresa
        FROM tenant_admin.tb_usuario u
        JOIN tenant_admin.tb_tenant t ON t.id = u.tenant_id
        WHERE u.email = :email
        LIMIT 1
        """
    )
    res = await session.execute(q, {"email": email})
    row = res.mappings().first()
    return dict(row) if row else None


async def get_tenant_schema_by_id(session: AsyncSession, tenant_id: str) -> Optional[str]:
    q = text(
        "SELECT schema_name FROM tenant_admin.tb_tenant WHERE id = :tenant_id LIMIT 1"
    )
    res = await session.execute(q, {"tenant_id": tenant_id})
    schema = res.scalar_one_or_none()
    return schema


async def validar_jwt_e_tenant(
    request: Request, session: AsyncSession = Depends(get_session)
) -> Dict[str, Any]:
    """
    Dependency for securing routes: validates JWT, resolves tenant schema,
    and applies search_path for the duration of the request transaction.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token nao fornecido")

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str | None = payload.get("user_id")
        tenant_id: str | None = payload.get("tenant_id")
        perfil: str | None = payload.get("perfil")
        if not user_id or not tenant_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado") from None

    schema_name = await get_tenant_schema_by_id(session, tenant_id)
    if not schema_name:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant nao encontrado")

    await set_tenant_search_path(session, schema_name)

    # Tornar o contexto disponivel para outras dependencias (ex.: get_tenant_context)
    # sem precisar decodificar o JWT novamente.
    context_dict = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "perfil": perfil,
        "roles": payload.get("roles", []) or ([] if perfil is None else [perfil.lower()]),
        "schema_name": schema_name,
    }
    try:
        request.state.nexus_context = context_dict
    except Exception:
        # state pode nao estar disponivel em alguns adaptadores, ignorar com seguranca
        pass

    return context_dict
