"""Basic proof upload endpoints (foundation)."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext, get_tenant_context
from app.dependencies.tenancy import get_tenant_session

from . import service
from .config import STORAGE_CONFIG, VALIDATION_CONFIG

router = APIRouter()


@router.post("/upload")
async def upload_proof(
    asset_id: str = Form(...),
    description: str = Form(""),
    proof_type: str | None = Form(None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    if not await service.verify_asset_access(session, asset_id, tenant_id=context.tenant_id):
        raise HTTPException(status_code=404, detail="Ativo nao encontrado.")

    saved_path, size, mime_type = await service.save_upload_file(Path(STORAGE_CONFIG.original_path), file)

    if size > VALIDATION_CONFIG.max_file_size:
        raise HTTPException(status_code=400, detail="Arquivo excede limite de 10MB.")
    if not service.validate_file_type(mime_type):
        raise HTTPException(status_code=400, detail="Tipo de arquivo nao permitido.")

    proof = await service.create_proof_record(
        session,
        tenant_id=context.tenant_id,
        asset_id=asset_id,
        supplier_user_id=context.user_id,
        file_name=file.filename or "arquivo",
        file_size=size,
        mime_type=mime_type,
        file_path=saved_path,
        proof_type=proof_type or service.infer_proof_type(mime_type),
        description=description,
    )

    await service.create_validation_record(
        session,
        tenant_id=context.tenant_id,
        proof_id=proof["id"],
        validation_type="file_type",
        passed=True,
        message="Tipo validado",
    )
    await service.create_validation_record(
        session,
        tenant_id=context.tenant_id,
        proof_id=proof["id"],
        validation_type="file_size",
        passed=True,
        message="Tamanho validado",
    )
    await service.process_proof_record(session, proof, tenant_id=context.tenant_id)
    await session.commit()
    return {"success": True, "proof": proof}


@router.get("/asset/{asset_id}")
async def list_proofs(
    asset_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    proofs = await service.list_asset_proofs(session, asset_id, tenant_id=context.tenant_id)
    return {"items": proofs}


@router.get("/status/{proof_id}")
async def proof_status(
    proof_id: str,
    session: AsyncSession = Depends(get_tenant_session),
    context: TenantContext = Depends(get_tenant_context),
):
    proof = await service.get_proof(session, proof_id, tenant_id=context.tenant_id)
    if not proof:
        raise HTTPException(status_code=404, detail="Comprovacao nao encontrada.")
    validations = await service.get_proof_validations(session, proof_id, tenant_id=context.tenant_id)
    return {"proof": proof, "validations": validations}
