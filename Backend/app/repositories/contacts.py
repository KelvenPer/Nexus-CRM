from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ContactCreate, ContactResponse


def _row_to_response(row: dict[str, Any]) -> ContactResponse:
    return ContactResponse(
        id=str(row["id"]),
        nome=row.get("nome") or "",
        email=row.get("email") or "",
        telefone=row.get("telefone"),
        conta=row.get("conta_nome"),
    )


async def list_contacts(session: AsyncSession) -> list[ContactResponse]:
    q = text(
        """
        SELECT c.id, c.nome, c.email, c.telefone, a.nome AS conta_nome
        FROM tb_contato c
        LEFT JOIN tb_conta a ON a.id = c.conta_id
        ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
        LIMIT 200
        """
    )
    res = await session.execute(q)
    return [_row_to_response(dict(r)) for r in res.mappings().all()]


async def create_contact(session: AsyncSession, payload: ContactCreate) -> ContactResponse:
    q = text(
        """
        INSERT INTO tb_contato (nome, email, telefone, cargo, origem, status_lead)
        VALUES (:nome, :email, :telefone, :cargo, :origem, :status)
        RETURNING id, nome, email, telefone
        """
    )
    params = {
        "nome": payload.nome,
        "email": payload.email,
        "telefone": payload.telefone,
        "cargo": None,
        "origem": None,
        "status": None,
    }
    res = await session.execute(q, params)
    row = dict(res.mappings().first())
    row["conta_nome"] = payload.conta
    return _row_to_response(row)

