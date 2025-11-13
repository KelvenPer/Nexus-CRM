"""Basic service-level endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/ping", summary="Health-check endpoint")
async def ping() -> dict[str, str]:
    return {"status": "ok"}
