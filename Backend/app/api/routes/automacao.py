from fastapi import APIRouter

router = APIRouter()

@router.get("/workflows", summary="List workflow definitions")
async def list_workflows():
    return []

@router.post("/workflows", summary="Save a workflow definition")
async def save_workflow():
    return {"status": "saved"}

@router.post("/workflows/{wf_id}/run", summary="Trigger a workflow")
async def run_workflow(wf_id: int):
    return {"workflow_id": wf_id, "status": "triggered"}
