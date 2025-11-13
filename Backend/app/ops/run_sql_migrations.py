"""
Run Nexus CRM Golden Schema migrations against the configured database.

It executes, in order, the SQL files under docs/sql skipping 00_create_database.sql
because it assumes the target database already exists (as per provided DATABASE_URL).

Usage:
  cd Backend
  python -m app.ops.run_sql_migrations
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings


SQL_ORDER = [
    "01_enable_extensions.sql",
    "02_create_schemas.sql",
    "03_tenant_admin_tables.sql",
    "04_template_schema_tables.sql",
    "05_clone_from_template.sql",
]


def _split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    buf: list[str] = []
    in_single = False
    in_double = False
    in_dollar: str | None = None
    i = 0
    length = len(sql)
    while i < length:
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < length else ""
        # Handle line comments -- ...\n
        if not in_single and not in_double and not in_dollar and ch == "-" and nxt == "-":
            # skip until end of line
            while i < length and sql[i] != "\n":
                buf.append(sql[i])  # keep comments to preserve line count in errors
                i += 1
            continue
        # Handle block comments /* ... */
        if not in_single and not in_double and not in_dollar and ch == "/" and nxt == "*":
            buf.append(ch)
            buf.append(nxt)
            i += 2
            while i < length and not (sql[i] == "*" and (i + 1 < length and sql[i + 1] == "/")):
                buf.append(sql[i])
                i += 1
            if i < length:
                buf.append("*")
                buf.append("/")
                i += 2
            continue
        # Dollar-quoted blocks: $tag$ ... $tag$
        if not in_single and not in_double:
            if in_dollar:
                if sql.startswith(in_dollar, i):
                    buf.append(in_dollar)
                    i += len(in_dollar)
                    in_dollar = None
                    continue
            else:
                if ch == "$":
                    # capture tag
                    j = i + 1
                    while j < length and sql[j] != "$":
                        j += 1
                    if j < length and sql[j] == "$":
                        tag = sql[i : j + 1]
                        in_dollar = tag
                        buf.append(tag)
                        i = j + 1
                        continue
        # String quotes
        if not in_dollar and ch == "'" and not in_double:
            in_single = not in_single
            buf.append(ch)
            i += 1
            continue
        if not in_dollar and ch == '"' and not in_single:
            in_double = not in_double
            buf.append(ch)
            i += 1
            continue
        # Statement terminator
        if ch == ";" and not in_single and not in_double and not in_dollar:
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt + ";")
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return statements


async def apply_sql_file(session: AsyncSession, sql_path: Path) -> None:
    sql = sql_path.read_text(encoding="utf-8")
    for stmt in _split_sql_statements(sql):
        await session.execute(text(stmt))


async def main() -> None:
    project_root = Path(__file__).resolve().parents[3]
    docs_sql = project_root / "docs" / "sql"
    missing = [name for name in SQL_ORDER if not (docs_sql / name).exists()]
    if missing:
        raise SystemExit(f"Missing SQL files: {missing}")

    print(f"Connecting to DB: {settings.database_url}")
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        session = AsyncSession(bind=conn)
        for name in SQL_ORDER:
            path = docs_sql / name
            print(f"Applying {path} ...", end=" ")
            await apply_sql_file(session, path)
            print("ok")
        await session.commit()
    await engine.dispose()
    print("Migrations completed successfully.")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
