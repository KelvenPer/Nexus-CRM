"""Entry-point for the Nexus CRM FastAPI application."""
from fastapi import FastAPI

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


def get_application() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.api_version,
        docs_url="/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
    )

    app.include_router(health.router, tags=["Health"])
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    app.include_router(inicio.router, prefix="/api/v1/inicio", tags=["General"])
    app.include_router(vendas.router, prefix="/api/v1/vendas", tags=["Sales"])
    app.include_router(marketing.router, prefix="/api/v1/marketing", tags=["Marketing"])
    app.include_router(automacao.router, prefix="/api/v1/automacao", tags=["Automation"])
    app.include_router(dados.router, prefix="/api/v1/dados", tags=["Data Area"])
    app.include_router(solucoes.router, prefix="/api/v1/solucoes", tags=["Solutions"])
    app.include_router(perfis.router, prefix="/api/v1", tags=["Profiles"])
    app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

    return app


app = get_application()
