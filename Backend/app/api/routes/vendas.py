from fastapi import APIRouter
from typing import List

router = APIRouter()

# Leads
@router.get("/leads", summary="List leads")
async def list_leads():
    return []

@router.post("/leads", summary="Create a new lead")
async def create_lead():
    return {"status": "created"}

@router.get("/leads/{lead_id}", summary="Get a specific lead")
async def get_lead(lead_id: int):
    return {"id": lead_id}

@router.put("/leads/{lead_id}", summary="Update a lead")
async def update_lead(lead_id: int):
    return {"id": lead_id, "status": "updated"}

@router.delete("/leads/{lead_id}", summary="Delete a lead")
async def delete_lead(lead_id: int):
    return {"id": lead_id, "status": "deleted"}

# Oportunidades
@router.get("/oportunidades", summary="List opportunities")
async def list_opportunities():
    return []

@router.post("/oportunidades", summary="Create a new opportunity")
async def create_opportunity():
    return {"status": "created"}

@router.get("/oportunidades/{op_id}", summary="Get a specific opportunity")
async def get_opportunity(op_id: int):
    return {"id": op_id}

@router.put("/oportunidades/{op_id}", summary="Update an opportunity")
async def update_opportunity(op_id: int):
    return {"id": op_id, "status": "updated"}

@router.delete("/oportunidades/{op_id}", summary="Delete an opportunity")
async def delete_opportunity(op_id: int):
    return {"id": op_id, "status": "deleted"}

# Contas
@router.get("/contas", summary="List accounts")
async def list_accounts():
    return []

@router.post("/contas", summary="Create a new account")
async def create_account():
    return {"status": "created"}

# Contatos
@router.get("/contatos", summary="List contacts")
async def list_contacts():
    return []

@router.post("/contatos", summary="Create a new contact")
async def create_contact():
    return {"status": "created"}
