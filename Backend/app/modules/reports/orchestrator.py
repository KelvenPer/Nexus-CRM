"""Report orchestration service."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import REPORT_TYPES
from .pdf_generator import generate_pdf


REPORT_DIR = Path("reports")


class ReportOrchestratorService:
    async def generate_contract_report(
        self,
        session: AsyncSession,
        *,
        tenant_id: str,
        supplier_id: str,
        contract_id: str,
        report_type: str,
    ) -> str:
        report_config = REPORT_TYPES.get(report_type)
        if not report_config:
            raise ValueError("Report type not supported")
        contract = await self._get_contract(session, contract_id, tenant_id=tenant_id)
        if not contract:
            raise ValueError("Contract not found")
        report_data = {
            "title": f"{report_config['name']} - {contract['title']}",
            "report_type": report_type,
            "supplier_name": contract["supplier_name"],
            "contract_title": contract["title"],
            "period_start": contract["start_date"],
            "period_end": contract["end_date"],
            "sections": self._build_sections(report_type, contract),
        }
        REPORT_DIR.mkdir(parents=True, exist_ok=True)
        file_path = REPORT_DIR / f"{contract_id}-{report_type}-{int(date.today().strftime('%Y%m%d'))}.pdf"
        generate_pdf(report_data, file_path)
        report_id = await self._persist_report(
            session,
            tenant_id=tenant_id,
            supplier_id=supplier_id,
            contract_id=contract_id,
            report_type=report_type,
            title=report_data["title"],
            file_path=str(file_path),
            file_size=file_path.stat().st_size,
            data_snapshot=report_data,
        )
        await session.commit()
        return report_id

    async def _get_contract(self, session: AsyncSession, contract_id: str, *, tenant_id: str) -> dict | None:
        stmt = text(
            """
            SELECT c.id, c.title, c.start_date, c.end_date, s.name AS supplier_name
            FROM trade_jbp_contracts c
            JOIN trade_suppliers s ON s.id = c.supplier_id
            WHERE c.id = :contract_id AND c.tenant_id = :tenant_id
            """
        )
        result = await session.execute(stmt, {"contract_id": contract_id, "tenant_id": tenant_id})
        row = result.mappings().first()
        return dict(row) if row else None

    def _build_sections(self, report_type: str, contract: dict) -> list[dict]:
        return [
            {
                "title": "Resumo Executivo",
                "content": [
                    {
                        "type": "metrics",
                        "metrics": [
                            {"label": "Fornecedor", "value": contract["supplier_name"]},
                            {"label": "Contrato", "value": contract["title"]},
                            {"label": "Periodo", "value": f"{contract['start_date']} a {contract['end_date']}"},
                        ],
                    }
                ],
            }
        ]

    async def _persist_report(
        self,
        session: AsyncSession,
        *,
        tenant_id: str,
        supplier_id: str,
        contract_id: str,
        report_type: str,
        title: str,
        file_path: str,
        file_size: int,
        data_snapshot: dict,
    ) -> str:
        stmt = text(
            """
            INSERT INTO supplier_reports (
                id, tenant_id, supplier_id, contract_id, report_type, title,
                period_start, period_end, file_path, file_size, included_sections,
                data_snapshot, status
            )
            VALUES (
                gen_random_uuid(), :tenant_id, :supplier_id, :contract_id, :report_type, :title,
                :period_start, :period_end, :file_path, :file_size, :sections::jsonb,
                :snapshot::jsonb, 'completed'
            )
            RETURNING id
            """
        )
        result = await session.execute(
            stmt,
            {
                "tenant_id": tenant_id,
                "supplier_id": supplier_id,
                "contract_id": contract_id,
                "report_type": report_type,
                "title": title,
                "period_start": data_snapshot["period_start"],
                "period_end": data_snapshot["period_end"],
                "file_path": file_path,
                "file_size": file_size,
                "sections": json.dumps([section["title"] for section in data_snapshot["sections"]]),
                "snapshot": json.dumps(data_snapshot),
            },
        )
        return result.scalar_one()

    async def get_report(self, session: AsyncSession, report_id: str, *, tenant_id: str, supplier_id: str) -> dict | None:
        stmt = text(
            """
            SELECT *
            FROM supplier_reports
            WHERE id = :report_id AND tenant_id = :tenant_id AND supplier_id = :supplier_id
            """
        )
        result = await session.execute(
            stmt,
            {"report_id": report_id, "tenant_id": tenant_id, "supplier_id": supplier_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def increment_download(self, session: AsyncSession, report_id: str) -> None:
        stmt = text(
            """
            UPDATE supplier_reports
            SET download_count = download_count + 1, updated_at = NOW()
            WHERE id = :report_id
            """
        )
        await session.execute(stmt, {"report_id": report_id})
