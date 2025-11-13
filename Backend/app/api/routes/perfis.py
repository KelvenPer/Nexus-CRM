from fastapi import APIRouter

from app.services.data_store import DEFAULT_PROFILES

router = APIRouter()


@router.get("/perfis-de-usuario", summary="Lista perfis configurados para o tenant")
async def list_user_profiles():
    return [{"id": profile.id, "name": profile.name} for profile in DEFAULT_PROFILES]
