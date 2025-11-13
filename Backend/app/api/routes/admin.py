from fastapi import APIRouter

from app.services.data_store import DEFAULT_PROFILES

router = APIRouter()


@router.get("/usuarios", summary="List users for the tenant")
async def list_users():
    return []


@router.post("/usuarios", summary="Manage users for the tenant (invite/deactivate)")
async def manage_user():
    return {"status": "user managed"}


@router.get("/perfis", summary="List access profiles")
async def list_profiles():
    return [profile.name for profile in DEFAULT_PROFILES]


@router.get("/perfis-de-usuario", summary="List user profiles with ids")
async def list_user_profiles():
    return [{"id": profile.id, "name": profile.name} for profile in DEFAULT_PROFILES]
