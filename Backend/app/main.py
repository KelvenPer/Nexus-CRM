"""Entry-point for the Nexus CRM FastAPI application."""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health
from app.core.config import settings
from app.middleware import ResponseTimeMiddleware
from app.security.jwt_tenancy import validar_jwt_e_tenant
from app.modules.trade.router import router as trade_router
from app.modules.data.router import router as data_router
from app.modules.proofs.router import router as proofs_router
from app.modules.proof_upload.router import router as proof_upload_router
from app.modules.reports.router import router as reports_router
from app.modules.supplier_portal.router import router as supplier_portal_router


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

    app.add_middleware(ResponseTimeMiddleware)

    app.include_router(health.router, tags=["Health"])  # public
    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])  # public

    # Protected routers: require JWT + tenant search_path
    deps = [Depends(validar_jwt_e_tenant)]
    # Trade & Data MVP routes
    app.include_router(trade_router, prefix="/api/trade", tags=["Trade"], dependencies=deps)
    app.include_router(proofs_router, prefix="/api/trade", tags=["Trade Proofs"], dependencies=deps)
    app.include_router(data_router, prefix="/api/data", tags=["Data"], dependencies=deps)
    app.include_router(proof_upload_router, prefix="/api/proofs", tags=["Proof Upload"], dependencies=deps)
    app.include_router(reports_router, prefix="/api/reports", tags=["Reports"], dependencies=deps)
    app.include_router(supplier_portal_router, prefix="/api/supplier-portal", tags=["Supplier Portal"], dependencies=deps)

    return app


app = get_application()
