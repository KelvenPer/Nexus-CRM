"""Service helpers for proof uploads and advanced processing."""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Sequence

from fastapi import UploadFile
from PIL import Image, ImageStat
from PyPDF2 import PdfReader
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import IMAGE_CONFIG, STORAGE_CONFIG, VALIDATION_CONFIG


async def verify_asset_access(session: AsyncSession, asset_id: str, *, tenant_id: str) -> bool:
    stmt = text(
        """
        SELECT 1
        FROM trade_jbp_contract_assets
        WHERE id = :asset_id AND tenant_id = :tenant_id
        LIMIT 1
        """
    )
    result = await session.execute(stmt, {"asset_id": asset_id, "tenant_id": tenant_id})
    return result.scalar() is not None


async def create_proof_record(
    session: AsyncSession,
    *,
    tenant_id: str,
    asset_id: str,
    supplier_user_id: str,
    file_name: str,
    file_size: int,
    mime_type: str,
    file_path: str,
    proof_type: str,
    description: str,
) -> dict:
    stmt = text(
        """
        INSERT INTO asset_proofs (
            tenant_id, asset_id, supplier_user_id, file_name, file_size,
            mime_type, file_path, proof_type, description, processing_status
        )
        VALUES (
            :tenant_id, :asset_id, :supplier_user_id, :file_name, :file_size,
            :mime_type, :file_path, :proof_type, :description, 'pending'
        )
        RETURNING *
        """
    )
    result = await session.execute(
        stmt,
        {
            "tenant_id": tenant_id,
            "asset_id": asset_id,
            "supplier_user_id": supplier_user_id,
            "file_name": file_name,
            "file_size": file_size,
            "mime_type": mime_type,
            "file_path": file_path,
            "proof_type": proof_type,
            "description": description,
        },
    )
    return dict(result.mappings().one())


async def create_validation_record(
    session: AsyncSession,
    *,
    tenant_id: str,
    proof_id: str,
    validation_type: str,
    passed: bool,
    message: str,
) -> None:
    stmt = text(
        """
        INSERT INTO proof_validations (
            id, tenant_id, proof_id, validation_type, passed, message
        )
        VALUES (
            gen_random_uuid(), :tenant_id, :proof_id, :validation_type, :passed, :message
        )
        """
    )
    await session.execute(
        stmt,
        {
            "tenant_id": tenant_id,
            "proof_id": proof_id,
            "validation_type": validation_type,
            "passed": passed,
            "message": message,
        },
    )


async def update_proof_status(session: AsyncSession, *, proof_id: str, status: str) -> None:
    stmt = text(
        """
        UPDATE asset_proofs
        SET status = :status, updated_at = NOW()
        WHERE id = :proof_id
        """
    )
    await session.execute(stmt, {"status": status, "proof_id": proof_id})


async def list_asset_proofs(session: AsyncSession, asset_id: str, *, tenant_id: str) -> Sequence[dict]:
    stmt = text(
        """
        SELECT *
        FROM asset_proofs
        WHERE asset_id = :asset_id AND tenant_id = :tenant_id
        ORDER BY created_at DESC
        """
    )
    result = await session.execute(stmt, {"asset_id": asset_id, "tenant_id": tenant_id})
    return [dict(row) for row in result.mappings().all()]


def infer_proof_type(mime_type: str) -> str:
    if mime_type.startswith("image/"):
        return "photo"
    if mime_type == "application/pdf":
        return "document"
    return "document"


def validate_file_type(mime_type: str) -> bool:
    return mime_type in set(VALIDATION_CONFIG.allowed_mimes)


def ensure_dir(path: Path) -> None:
    os.makedirs(path, exist_ok=True)


async def save_upload_file(upload_dir: Path, file: UploadFile) -> tuple[str, int, str]:
    ensure_dir(upload_dir)
    contents = await file.read()
    size = len(contents)
    unique_name = f"{datetime.utcnow().timestamp():.0f}-{file.filename}"
    file_path = upload_dir / unique_name
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    return str(file_path), size, file.content_type or "application/octet-stream"


async def get_proof(session: AsyncSession, proof_id: str, *, tenant_id: str) -> dict | None:
    stmt = text(
        """
        SELECT *
        FROM asset_proofs
        WHERE id = :proof_id AND tenant_id = :tenant_id
        """
    )
    result = await session.execute(stmt, {"proof_id": proof_id, "tenant_id": tenant_id})
    row = result.mappings().first()
    return dict(row) if row else None


async def get_proof_validations(session: AsyncSession, proof_id: str, *, tenant_id: str) -> list[dict]:
    stmt = text(
        """
        SELECT validation_type, passed, message, created_at
        FROM proof_validations
        WHERE proof_id = :proof_id AND tenant_id = :tenant_id
        ORDER BY created_at DESC
        """
    )
    result = await session.execute(stmt, {"proof_id": proof_id, "tenant_id": tenant_id})
    return [dict(row) for row in result.mappings().all()]


async def process_proof_record(session: AsyncSession, proof: dict, *, tenant_id: str) -> dict:
    await _update_processing_status(session, proof["id"], "processing")
    file_path = Path(proof["file_path"])
    metadata: dict[str, Any] = {}
    thumbnail_path: str | None = None
    try:
        if proof["mime_type"].startswith("image/"):
            metadata, thumbnail_path = _process_image(file_path)
        elif proof["mime_type"] == "application/pdf":
            metadata, thumbnail_path = _process_pdf(file_path)
        file_hash = _hash_file(file_path)
        await _persist_metadata(
            session,
            tenant_id=tenant_id,
            proof_id=proof["id"],
            metadata=metadata,
            thumbnail_path=thumbnail_path,
            file_hash=file_hash,
        )
        await run_advanced_validations(session, proof["id"], tenant_id=tenant_id, metadata=metadata)
        await _update_processing_status(session, proof["id"], "completed")
    except Exception as exc:  # pragma: no cover - best effort
        await _update_processing_status(session, proof["id"], "failed")
        raise exc
    return await get_proof(session, proof["id"], tenant_id=tenant_id) or proof


def _process_image(file_path: Path) -> tuple[dict, str | None]:
    ensure_dir(Path(STORAGE_CONFIG.thumbnail_path))
    with Image.open(file_path) as img:
        original_w, original_h = img.size
        metadata: dict[str, Any] = {
            "type": "image",
            "dimensions": {"original": {"width": original_w, "height": original_h}},
            "format": img.format,
        }
        thumb = img.copy()
        thumb.thumbnail((IMAGE_CONFIG.thumb_width, IMAGE_CONFIG.thumb_height))
        thumb_name = f"{file_path.stem}-thumb.jpg"
        thumb_path = Path(STORAGE_CONFIG.thumbnail_path) / thumb_name
        thumb.save(thumb_path, format="JPEG", quality=IMAGE_CONFIG.thumb_quality)
        metadata["dimensions"]["thumbnail"] = {"width": thumb.size[0], "height": thumb.size[1]}
        metadata["dominant_color"] = _dominant_color(img)
        return metadata, str(thumb_path)


def _process_pdf(file_path: Path) -> tuple[dict, str | None]:
    reader = PdfReader(str(file_path))
    page_count = len(reader.pages)
    metadata = {"type": "pdf", "page_count": page_count}
    return metadata, None


def _hash_file(path: Path) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(8192), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _dominant_color(img: Image.Image) -> str | None:
    try:
        stat = ImageStat.Stat(img.convert("RGB"))
        r, g, b = [int(v) for v in stat.mean]
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:  # pragma: no cover
        return None


async def _persist_metadata(
    session: AsyncSession,
    *,
    tenant_id: str,
    proof_id: str,
    metadata: dict,
    thumbnail_path: str | None,
    file_hash: str,
) -> None:
    stmt = text(
        """
        UPDATE asset_proofs
        SET metadata = :metadata::jsonb,
            thumbnail_path = :thumbnail_path,
            file_hash = :file_hash
        WHERE id = :proof_id
        """
    )
    await session.execute(
        stmt,
        {
            "metadata": json.dumps(metadata),
            "thumbnail_path": thumbnail_path,
            "file_hash": file_hash,
            "proof_id": proof_id,
        },
    )
    stmt_meta = text(
        """
        INSERT INTO proof_metadata (
            id, tenant_id, proof_id, image_width, image_height, dominant_color, page_count
        )
        VALUES (
            gen_random_uuid(), :tenant_id, :proof_id, :width, :height, :color, :page_count
        )
        """
    )
    dims = metadata.get("dimensions", {}).get("original", {})
    await session.execute(
        stmt_meta,
        {
            "tenant_id": tenant_id,
            "proof_id": proof_id,
            "width": dims.get("width"),
            "height": dims.get("height"),
            "color": metadata.get("dominant_color"),
            "page_count": metadata.get("page_count"),
        },
    )


async def run_advanced_validations(
    session: AsyncSession,
    proof_id: str,
    *,
    tenant_id: str,
    metadata: dict,
) -> None:
    tasks = []
    dims = metadata.get("dimensions", {}).get("original")
    if dims:
        width = dims.get("width", 0)
        height = dims.get("height", 0)
        passed = (
            VALIDATION_CONFIG.min_width <= width <= VALIDATION_CONFIG.max_width
            and VALIDATION_CONFIG.min_height <= height <= VALIDATION_CONFIG.max_height
        )
        tasks.append(
            create_validation_record(
                session,
                tenant_id=tenant_id,
                proof_id=proof_id,
                validation_type="image_dimensions",
                passed=passed,
                message=f"{width}x{height}",
            )
        )
    if metadata.get("type") == "pdf":
        pages = metadata.get("page_count", 0)
        tasks.append(
            create_validation_record(
                session,
                tenant_id=tenant_id,
                proof_id=proof_id,
                validation_type="pdf_pages",
                passed=pages <= 50,
                message=f"{pages} paginas",
            )
        )
    if tasks:
        await asyncio.gather(*tasks)


async def _update_processing_status(session: AsyncSession, proof_id: str, status: str) -> None:
    stmt = text(
        """
        UPDATE asset_proofs
        SET processing_status = :status, updated_at = NOW()
        WHERE id = :proof_id
        """
    )
    await session.execute(stmt, {"status": status, "proof_id": proof_id})
