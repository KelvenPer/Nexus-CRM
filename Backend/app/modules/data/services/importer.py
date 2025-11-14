"""CSV importer for supplier sales."""
from __future__ import annotations

import csv
import io
from datetime import date, datetime
from typing import Any, Iterable
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.data.schemas import ImportSalesResponse, SalesImportSummary


class SalesImportService:
    REQUIRED_COLUMNS = {"supplier_id", "supplier_name", "year", "week", "sales_amount", "period_date"}

    async def import_file(
        self,
        session: AsyncSession,
        *,
        file: UploadFile,
        tenant_id: str,
    ) -> ImportSalesResponse:
        content = await file.read()
        rows = self._parse_csv(content.decode("utf-8"))
        self._validate_rows(rows)
        summary = await self._persist_rows(session, rows, tenant_id=tenant_id)
        await session.commit()
        return ImportSalesResponse(
            summary=SalesImportSummary(**summary),
            sample_rows=rows[:5],
        )

    def _parse_csv(self, text_content: str) -> list[dict[str, Any]]:
        reader = csv.DictReader(io.StringIO(text_content))
        return [row for row in reader]

    def _validate_rows(self, rows: Iterable[dict[str, Any]]) -> None:
        if not rows:
            raise ValueError("Arquivo CSV vazio.")
        missing = self.REQUIRED_COLUMNS - set(rows[0].keys())
        if missing:
            raise ValueError(f"Colunas obrigatorias ausentes: {', '.join(sorted(missing))}")

    async def _persist_rows(
        self,
        session: AsyncSession,
        rows: list[dict[str, Any]],
        *,
        tenant_id: str,
    ) -> dict[str, int]:
        suppliers_upserted = set()
        products_upserted = set()
        for row in rows:
            supplier_id = row.get("supplier_id") or str(uuid4())
            await self._upsert_supplier(session, row, supplier_id=supplier_id, tenant_id=tenant_id)
            suppliers_upserted.add(supplier_id)

            await self._upsert_sales(session, row, supplier_id=supplier_id, tenant_id=tenant_id)

            if row.get("product_id"):
                product_id = await self._upsert_product(session, row, supplier_id=supplier_id, tenant_id=tenant_id)
                products_upserted.add(product_id)
                await self._upsert_product_sales(session, row, product_id=product_id, supplier_id=supplier_id, tenant_id=tenant_id)

        return {
            "rows_imported": len(rows),
            "suppliers_upserted": len(suppliers_upserted),
            "products_upserted": len(products_upserted),
        }

    async def _upsert_supplier(
        self,
        session: AsyncSession,
        row: dict[str, Any],
        *,
        supplier_id: str,
        tenant_id: str,
    ) -> None:
        stmt = text(
            """
            INSERT INTO trade_suppliers (
                id, tenant_id, name, cnpj, email, phone,
                category, business_size, priority_level, payment_terms, strategic_importance,
                total_investment, total_sales, average_roi
            )
            VALUES (
                :id, :tenant_id, :name, :cnpj, :email, :phone,
                :category, :business_size, :priority_level, :payment_terms, :strategic_importance,
                :total_investment, :total_sales, :average_roi
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                business_size = EXCLUDED.business_size,
                priority_level = EXCLUDED.priority_level,
                payment_terms = EXCLUDED.payment_terms,
                strategic_importance = EXCLUDED.strategic_importance,
                total_sales = trade_suppliers.total_sales + EXCLUDED.total_sales,
                updated_at = NOW()
            """
        )
        await session.execute(
            stmt,
            {
                "id": supplier_id,
                "tenant_id": tenant_id,
                "name": row.get("supplier_name"),
                "cnpj": row.get("cnpj"),
                "email": row.get("email"),
                "phone": row.get("phone"),
                "category": row.get("category") or "geral",
                "business_size": row.get("business_size"),
                "priority_level": int(row.get("priority_level") or 3),
                "payment_terms": row.get("payment_terms"),
                "strategic_importance": row.get("strategic_importance") or "medium",
                "total_investment": self._to_float(row.get("investment_value")),
                "total_sales": self._to_float(row.get("sales_amount")),
                "average_roi": self._to_float(row.get("expected_roi")),
            },
        )

    async def _upsert_sales(
        self,
        session: AsyncSession,
        row: dict[str, Any],
        *,
        supplier_id: str,
        tenant_id: str,
    ) -> None:
        stmt = text(
            """
            INSERT INTO trade_supplier_sales (
                id, tenant_id, supplier_id, jbp_plan_id,
                year, week, period_date, sales_amount, sales_quantity,
                average_ticket, growth_percentage, market_share,
                previous_sales_amount, department_sales_amount
            )
            VALUES (
                gen_random_uuid(), :tenant_id, :supplier_id, :jbp_plan_id,
                :year, :week, :period_date, :sales_amount, :sales_quantity,
                :average_ticket, :growth_percentage, :market_share,
                :previous_sales_amount, :department_sales_amount
            )
            ON CONFLICT (supplier_id, year, week) DO UPDATE SET
                sales_amount = EXCLUDED.sales_amount,
                sales_quantity = EXCLUDED.sales_quantity,
                average_ticket = EXCLUDED.average_ticket,
                growth_percentage = EXCLUDED.growth_percentage,
                market_share = EXCLUDED.market_share,
                previous_sales_amount = EXCLUDED.previous_sales_amount,
                department_sales_amount = EXCLUDED.department_sales_amount,
                jbp_plan_id = COALESCE(EXCLUDED.jbp_plan_id, trade_supplier_sales.jbp_plan_id)
            """
        )
        await session.execute(
            stmt,
            {
                "tenant_id": tenant_id,
                "supplier_id": supplier_id,
                "jbp_plan_id": row.get("jbp_plan_id"),
                "year": self._to_int(row.get("year")),
                "week": self._to_int(row.get("week")),
                "period_date": self._parse_date(row.get("period_date")),
                "sales_amount": self._to_float(row.get("sales_amount")),
                "sales_quantity": self._to_int(row.get("sales_quantity")),
                "average_ticket": self._to_float(row.get("average_ticket")),
                "growth_percentage": self._to_float(row.get("growth_percentage")),
                "market_share": self._to_float(row.get("market_share")),
                "previous_sales_amount": self._to_float(row.get("previous_sales_amount")),
                "department_sales_amount": self._to_float(row.get("department_sales_amount")),
            },
        )

    async def _upsert_product(
        self,
        session: AsyncSession,
        row: dict[str, Any],
        *,
        supplier_id: str,
        tenant_id: str,
    ) -> str:
        product_id = row.get("product_id") or str(uuid4())
        stmt = text(
            """
            INSERT INTO trade_supplier_products (
                id, tenant_id, supplier_id, sku_code, product_name,
                category, department, price, sell_through_rate, rotation_speed
            )
            VALUES (
                :id, :tenant_id, :supplier_id, :sku_code, :product_name,
                :category, :department, :price, :sell_through_rate, :rotation_speed
            )
            ON CONFLICT (id) DO UPDATE SET
                product_name = EXCLUDED.product_name,
                price = EXCLUDED.price,
                sell_through_rate = EXCLUDED.sell_through_rate,
                rotation_speed = EXCLUDED.rotation_speed
            """
        )
        await session.execute(
            stmt,
            {
                "id": product_id,
                "tenant_id": tenant_id,
                "supplier_id": supplier_id,
                "sku_code": row.get("sku_code") or f"SKU-{product_id[:6]}",
                "product_name": row.get("product_name") or "Produto",
                "category": row.get("product_category"),
                "department": row.get("department"),
                "price": self._to_float(row.get("price")),
                "sell_through_rate": self._to_float(row.get("sell_through_rate")),
                "rotation_speed": row.get("rotation_speed"),
            },
        )
        return product_id

    async def _upsert_product_sales(
        self,
        session: AsyncSession,
        row: dict[str, Any],
        *,
        product_id: str,
        supplier_id: str,
        tenant_id: str,
    ) -> None:
        stmt = text(
            """
            INSERT INTO trade_product_sales (
                id, tenant_id, product_id, supplier_id, year, week,
                sales_amount, sales_quantity, profit_margin
            )
            VALUES (
                gen_random_uuid(), :tenant_id, :product_id, :supplier_id, :year, :week,
                :sales_amount, :sales_quantity, :profit_margin
            )
            """
        )
        await session.execute(
            stmt,
            {
                "tenant_id": tenant_id,
                "product_id": product_id,
                "supplier_id": supplier_id,
                "year": self._to_int(row.get("year")),
                "week": self._to_int(row.get("week")),
                "sales_amount": self._to_float(row.get("product_sales_amount") or row.get("sales_amount")),
                "sales_quantity": self._to_int(row.get("product_sales_quantity") or row.get("sales_quantity")),
                "profit_margin": self._to_float(row.get("profit_margin")),
            },
        )

    def _parse_date(self, value: Any) -> date:
        if not value:
            return datetime.utcnow().date()
        if isinstance(value, datetime):
            return value.date()
        try:
            return datetime.fromisoformat(str(value)).date()
        except ValueError:
            return datetime.utcnow().date()

    def _to_float(self, value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    def _to_int(self, value: Any) -> int:
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return 0
