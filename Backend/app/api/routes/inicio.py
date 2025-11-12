from fastapi import APIRouter

router = APIRouter()

@router.get("/dashboard/kpis", summary="Get main dashboard KPIs")
async def get_dashboard_kpis():
    """
    Busca KPIs principais (Ex: Novas Oportunidades, Atividades Atrasadas).
    """
    return {"kpis": "data"}

@router.get("/atividades", summary="List user's activities")
async def get_user_activities():
    """
    Lista minhas atividades (filtram tb_atividade pelo user_id logado).
    """
    return {"activities": []}

@router.get("/calendario", summary="List calendar activities")
async def get_calendar_activities():
    """
    Lista atividades (tb_atividade) por data.
    """
    return {"calendar_events": []}
