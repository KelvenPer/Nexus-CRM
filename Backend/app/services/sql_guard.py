"""Centralized SQL validation helpers for the Estudio SQL module."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

COMMENT_PATTERN = re.compile(r"(--.*?$)|(/\*.*?\*/)", re.MULTILINE | re.DOTALL)
FORBIDDEN_COMMANDS = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    "CALL",
    "EXEC",
    "PROCEDURE",
    "SET SEARCH_PATH",
    "COMMIT",
    "ROLLBACK",
)


@dataclass(slots=True)
class SQLValidationResult:
    normalized_query: str
    rows_affected: int
    sample_rows: List[dict[str, Any]]
    execution_time_ms: int


def _strip_comments(query: str) -> str:
    return COMMENT_PATTERN.sub(" ", query)


def _normalize_query(raw_query: str) -> str:
    if not raw_query or not raw_query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A consulta SQL nao pode ser vazia.",
        )

    normalized = raw_query.strip()
    if not normalized.endswith(";"):
        normalized = f"{normalized};"
    return normalized


def _ensure_single_statement(query: str) -> None:
    body = query.rstrip(";")
    if ";" in body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie apenas uma instrucao SQL por vez.",
        )


def _ensure_no_forbidden_keywords(query: str) -> None:
    normalized = re.sub(r"\s+", " ", _strip_comments(query).upper())
    for keyword in FORBIDDEN_COMMANDS:
        pattern = rf"\b{re.escape(keyword)}\b"
        if re.search(pattern, normalized):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comando SQL proibido detectado. Apenas SELECT/CTE sao permitidos.",
            )


def _ensure_select_statement(query: str) -> None:
    stripped = _strip_comments(query).strip()
    upper = stripped.upper()
    if not (upper.startswith("SELECT") or upper.startswith("WITH")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A consulta deve comecar com SELECT ou WITH.",
        )


async def validar_e_executar_sql_seguro(
    query_bruta: str,
    session: AsyncSession | None = None,
) -> SQLValidationResult:
    """
    Multi-layer SQL guard used by the Estudio SQL routes.

    The function validates that the statement is a single SELECT/CTE,
    blocks destructive keywords and (in the future) will execute the
    query using the tenant-scoped AsyncSession.
    """

    normalized = _normalize_query(query_bruta)
    _ensure_single_statement(normalized)
    _ensure_no_forbidden_keywords(normalized)
    _ensure_select_statement(normalized)

    # TODO: hook into PostgreSQL once available. For now we simulate latency/results.
    sample_rows: list[dict[str, Any]] = [
        {"coluna_a": 1, "coluna_b": "Dado A"},
        {"coluna_a": 2, "coluna_b": "Dado B"},
    ]

    return SQLValidationResult(
        normalized_query=normalized,
        rows_affected=0,
        sample_rows=sample_rows,
        execution_time_ms=35,
    )
