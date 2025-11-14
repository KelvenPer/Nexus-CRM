from __future__ import annotations

from datetime import date
from typing import List
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TenantContext
from app.models import (
    CampaignCreate,
    CampaignResponse,
    SegmentCreate,
    SegmentResponse,
)


class MarketingRepository:
    def __init__(self, session: AsyncSession, context: TenantContext) -> None:
        self.session = session
        self.context = context

    # Campaigns -------------------------------------------------------
    async def list_campaigns(self) -> List[CampaignResponse]:
        q = text(
            """
            SELECT id, nome, status, investimento, inicio, fim
            FROM marketing_campaigns
            ORDER BY created_at DESC
            LIMIT 200
            """
        )
        res = await self.session.execute(q)
        rows = res.mappings().all()
        return [
            CampaignResponse(
                id=str(r["id"]),
                nome=r["nome"],
                status=r["status"],
                investimento=float(r["investimento"]),
                inicio=(r["inicio"].isoformat() if r["inicio"] else ""),
                fim=(r["fim"].isoformat() if r["fim"] else ""),
            )
            for r in rows
        ]

    async def create_campaign(self, payload: CampaignCreate) -> CampaignResponse:
        q = text(
            """
            INSERT INTO marketing_campaigns (nome, status, investimento, inicio, fim, owner_user_id)
            VALUES (:nome, :status, :invest, :inicio, :fim, :owner)
            RETURNING id, nome, status, investimento, inicio, fim
            """
        )
        params = {
            "nome": payload.nome,
            "status": payload.status,
            "invest": float(payload.investimento),
            "inicio": date.fromisoformat(payload.inicio),
            "fim": date.fromisoformat(payload.fim),
            "owner": self.context.user_id,
        }
        res = await self.session.execute(q, params)
        row = res.mappings().first()
        await self.session.commit()
        return CampaignResponse(
            id=str(row["id"]),
            nome=row["nome"],
            status=row["status"],
            investimento=float(row["investimento"]),
            inicio=row["inicio"].isoformat(),
            fim=row["fim"].isoformat(),
        )

    # Segments --------------------------------------------------------
    async def list_segments(self) -> List[SegmentResponse]:
        q = text(
            """
            SELECT id, nome, regra, tamanho
            FROM marketing_segments
            ORDER BY created_at DESC
            LIMIT 200
            """
        )
        res = await self.session.execute(q)
        rows = res.mappings().all()
        return [
            SegmentResponse(
                id=str(r["id"]), nome=r["nome"], regra=r["regra"], tamanho=int(r["tamanho"]) or 0
            )
            for r in rows
        ]

    async def create_segment(self, payload: SegmentCreate) -> SegmentResponse:
        q = text(
            """
            INSERT INTO marketing_segments (nome, regra, tamanho)
            VALUES (:nome, :regra, :tamanho)
            RETURNING id, nome, regra, tamanho
            """
        )
        params = {
            "nome": payload.nome,
            "regra": payload.regra,
            "tamanho": int(payload.tamanho or 0),
        }
        res = await self.session.execute(q, params)
        row = res.mappings().first()
        await self.session.commit()
        return SegmentResponse(
            id=str(row["id"]), nome=row["nome"], regra=row["regra"], tamanho=int(row["tamanho"]) or 0
        )

