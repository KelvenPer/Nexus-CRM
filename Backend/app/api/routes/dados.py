from fastapi import APIRouter

router = APIRouter()

# Estúdio SQL
@router.post("/query/test", summary="Execute a test SQL query securely")
async def test_sql_query(query: dict):
    # query: {"query": "SELECT ..."}
    return {"result": "query executed"}

@router.get("/meta/schemas", summary="List schemas and objects for SchemaBrowser")
async def get_meta_schemas():
    return {"schemas": []}

# Metadados
@router.get("/meta-objetos", summary="List custom meta-objects")
async def list_meta_objects():
    return []

@router.post("/meta-objetos", summary="Save a new custom meta-object")
async def create_meta_object():
    return {"status": "created"}

@router.get("/meta-objetos/{obj_id}/permissoes", summary="Get permissions for a meta-object")
async def get_meta_object_permissions(obj_id: int):
    return {"permissions": []}

@router.put("/meta-objetos/{obj_id}/permissoes", summary="Update permissions for a meta-object")
async def update_meta_object_permissions(obj_id: int):
    return {"status": "updated"}

# Relatórios e BI
@router.get("/dashboards", summary="List dashboards")
async def list_dashboards():
    return []

@router.post("/dashboards", summary="Save a dashboard")
async def save_dashboard():
    return {"status": "saved"}

@router.post("/query/no-code", summary="Execute a no-code query")
async def execute_no_code_query(query_spec: dict):
    # query_spec: { objectId, groupBy, aggregate }
    return {"data": []}

@router.get("/widgets/target/{target_name}", summary="Get widgets for a specific target")
async def get_widgets_by_target(target_name: str):
    return {"widgets": []}
