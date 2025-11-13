"""Entry-point for the Nexus CRM FastAPI application."""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin,
    auth,
    automacao,
    dados,
    health,
    inicio,
    perfis,
    solucoes,
    marketing,
    vendas,
)
from app.core.config import settings
from app.security.jwt_tenancy import validar_jwt_e_tenant


def get_application() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.api_version,
        docs_url="/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
    )

    # CORS: usar lista de dominios em producao; no dev, liberar geral.
    cors_origins = settings.cors_origins_list
    if settings.environment.lower() == "development":
        cors_origins = cors_origins or ["*"]

    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router, tags=["Health"])  # public
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])  # public

    # Protected routers: require JWT + tenant search_path
    deps = [Depends(validar_jwt_e_tenant)]
    app.include_router(inicio.router, prefix="/api/v1/inicio", tags=["General"], dependencies=deps)
    app.include_router(vendas.router, prefix="/api/v1/vendas", tags=["Sales"], dependencies=deps)
    app.include_router(marketing.router, prefix="/api/v1/marketing", tags=["Marketing"], dependencies=deps)
    app.include_router(automacao.router, prefix="/api/v1/automacao", tags=["Automation"], dependencies=deps)
    app.include_router(dados.router, prefix="/api/v1/dados", tags=["Data Area"], dependencies=deps)
    app.include_router(solucoes.router, prefix="/api/v1/solucoes", tags=["Solutions"], dependencies=deps)
    app.include_router(perfis.router, prefix="/api/v1", tags=["Profiles"], dependencies=deps)
    app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"], dependencies=deps)

    return app


app = get_application()
