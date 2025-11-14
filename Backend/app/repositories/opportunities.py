from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OpportunityCreate, OpportunityResponse


# Mapping between API "stage" labels and DB allowed values
_STAGE_TO_DB = {
    "Propostas": "PROPOSTA",
    "Proposta": "PROPOSTA",
    "Negociacao": "PROPOSTA",
    "Demonstracao": "PROSPEC",
    "Prospeccao": "PROSPEC",
    "Ganho": "GANHO",
    "Perdido": "PERDIDO",
}

_DB_TO_STAGE = {
    "PROPOSTA": "Propostas",
    "PROSPEC": "Prospeccao",
    "GANHO": "Ganho",
    "PERDIDO": "Perdido",
}


def _to_db_stage(stage: str) -> str:
    return _STAGE_TO_DB.get(stage, "PROSPEC")


def _from_db_stage(db_stage: str | None) -> str:
    if not db_stage:
        return "Prospeccao"
    return _DB_TO_STAGE.get(db_stage.upper(), "Prospeccao")


def _row_to_response(row: dict[str, Any]) -> OpportunityResponse:
    return OpportunityResponse(
        id=str(row["id"]),
        nome=row.get("nome_oportunidade") or row.get("nome") or "",
        stage=_from_db_stage(row.get("estagio_funil")),
        valor=float(row.get("valor_estimado") or 0.0),
        probabilidade=(float(row.get("probabilidade") or 0) / 100.0),
        owner=row.get("owner") or row.get("owner_name") or "",
        updatedAt=row.get("atualizado_em") or datetime.utcnow(),
    )


async def list_opportunities(session: AsyncSession) -> list[OpportunityResponse]:
    q = text(
        """
        SELECT id,
               nome,
               valor,
               estagio,
               probabilidade,
               updated_at
        FROM tb_oportunidade
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 200
        """
    )
    res = await session.execute(q)
    rows = [dict(r) for r in res.mappings().all()]
    return [_row_to_response(r) for r in rows]


async def get_opportunity(session: AsyncSession, op_id: str) -> OpportunityResponse | None:
    q = text(
        """
        SELECT id,
               nome,
               valor,
               estagio,
               probabilidade,
               updated_at
        FROM tb_oportunidade
        WHERE id = :id
        LIMIT 1
        """
    )
    res = await session.execute(q, {"id": op_id})
    row = res.mappings().first()
    return _row_to_response(dict(row)) if row else None


async def create_opportunity(
    session: AsyncSession, tenant_id: str, payload: OpportunityCreate
) -> OpportunityResponse:
    q = text(
        """
        INSERT INTO tb_oportunidade (
            nome,
            valor,
            estagio,
            probabilidade
        ) VALUES (
            :nome,
            :valor,
            :estagio,
            :prob
        ) RETURNING id, nome, valor, estagio, probabilidade, updated_at
        """
    )
    params = {
        "nome": payload.nome,
        "valor": float(payload.valor),
        "estagio": _to_db_stage(payload.stage),
        "prob": int(round((payload.probabilidade or 0.0) * 100)),
    }
    res = await session.execute(q, params)
    row = dict(res.mappings().first())
    # Echo owner (not persisted yet)
    row["owner"] = payload.owner
    return _row_to_response(row)


async def update_opportunity(
    session: AsyncSession, op_id: str, payload: OpportunityCreate
) -> OpportunityResponse | None:
    q = text(
        """
        UPDATE tb_oportunidade
        SET nome = :nome,
            valor = :valor,
            estagio = :estagio,
            probabilidade = :prob,
            updated_at = NOW()
        WHERE id = :id
        RETURNING id, nome, valor, estagio, probabilidade, updated_at
        """
    )
    params = {
        "id": op_id,
        "nome": payload.nome,
        "valor": float(payload.valor),
        "estagio": _to_db_stage(payload.stage),
        "prob": int(round((payload.probabilidade or 0.0) * 100)),
    }
    res = await session.execute(q, params)
    row = res.mappings().first()
    if not row:
        return None
    row = dict(row)
    row["owner"] = payload.owner
    return _row_to_response(row)


async def delete_opportunity(session: AsyncSession, op_id: str) -> bool:
    q = text("DELETE FROM tb_oportunidade WHERE id = :id")
    res = await session.execute(q, {"id": op_id})
    # When using text, rowcount is available
    return (res.rowcount or 0) > 0
