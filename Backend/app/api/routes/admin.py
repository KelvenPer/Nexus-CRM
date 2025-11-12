from fastapi import APIRouter

router = APIRouter()

@router.get("/usuarios", summary="List users for the tenant")
async def list_users():
    return []

@router.post("/usuarios", summary="Manage users for the tenant (invite/deactivate)")
async def manage_user():
    return {"status": "user managed"}

@router.get("/perfis", summary="List access profiles")
async def list_profiles():
    return ["Vendedor", "Gerente", "Admin de Dados"]
