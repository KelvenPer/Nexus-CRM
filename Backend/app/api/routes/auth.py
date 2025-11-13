from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    CheckEmailRequest,
    CheckEmailResponse,
    LogoutRequest,
    TokenRequest,
    TokenResponse,
)
from app.db.session import get_session
from app.security.jwt_tenancy import (
    create_access_token,
    get_user_by_email,
    verify_password,
)

router = APIRouter()


@router.post(
    "/check-email",
    summary="Identify tenant and user based on email",
    response_model=CheckEmailResponse,
)
async def check_email(payload: CheckEmailRequest, session: AsyncSession = Depends(get_session)) -> CheckEmailResponse:
    db_user = await get_user_by_email(session, payload.email)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado.")

    # userName: fallback to email if no explicit name column
    return CheckEmailResponse(
        email=db_user["email"],
        userName=db_user["email"],
        tenantId=str(db_user["tenant_id"]),
        tenantName=db_user.get("nome_empresa", ""),
        tenantLogoUrl=None,
    )


@router.post(
    "/token",
    summary="Authenticate user and get session token",
    response_model=TokenResponse,
)
async def login_for_access_token(
    payload: TokenRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    db_user = await get_user_by_email(session, payload.email)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas.")

    if not verify_password(payload.password, db_user["senha_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais invalidas.")

    roles = [db_user.get("perfil", "").lower()] if db_user.get("perfil") else []
    token = create_access_token(
        {
            "sub": str(db_user["user_id"]),
            "user_id": str(db_user["user_id"]),
            "tenant_id": str(db_user["tenant_id"]),
            "perfil": db_user.get("perfil"),
            "roles": roles,
        }
    )
    return TokenResponse(
        access_token=token,
        userId=str(db_user["user_id"]),
        userName=db_user.get("email", ""),
        tenantId=str(db_user["tenant_id"]),
        tenantName=db_user.get("nome_empresa", ""),
        tenantLogoUrl=None,
        roles=roles,
    )


@router.post("/logout", summary="Logout user")
async def logout(payload: LogoutRequest) -> dict:
    data_store.invalidate_token(payload.token)
    return {"message": "Sessao finalizada com sucesso."}
