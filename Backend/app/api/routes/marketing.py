from fastapi import APIRouter

router = APIRouter()

@router.get("/campanhas", summary="List campaigns")
async def list_campaigns():
    return []

@router.post("/campanhas", summary="Create a new campaign")
async def create_campaign():
    return {"status": "created"}

@router.get("/segmentos", summary="List segments")
async def list_segments():
    return []

@router.post("/segmentos", summary="Create a new segment")
async def create_segment():
    return {"status": "created"}
