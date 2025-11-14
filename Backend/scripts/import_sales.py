"""Simple helper script to push CSV sales data into the API."""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

import httpx


async def main() -> None:
    parser = argparse.ArgumentParser(description="Send CSV sales data to the Nexus CRM API.")
    parser.add_argument("--file", required=True, help="Path to the CSV file.")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Backend base URL (default: http://localhost:8000).",
    )
    parser.add_argument(
        "--token",
        help="Optional bearer token for authenticated environments.",
    )
    parser.add_argument(
        "--tenant",
        default="tenant_demo",
        help="Tenant identifier header (X-Tenant-ID).",
    )
    parser.add_argument(
        "--user",
        default="user_demo",
        help="User identifier header (X-User-ID).",
    )
    args = parser.parse_args()

    csv_path = Path(args.file).expanduser().resolve()
    if not csv_path.exists():
        raise SystemExit(f"CSV file not found: {csv_path}")

    headers = {
        "X-Tenant-ID": args.tenant,
        "X-User-ID": args.user,
    }
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    async with httpx.AsyncClient(timeout=60) as client:
        with csv_path.open("rb") as fh:
            files = {"file": (csv_path.name, fh, "text/csv")}
            response = await client.post(
                f"{args.base_url.rstrip('/')}/api/data/import-sales",
                headers=headers,
                files=files,
            )
    response.raise_for_status()
    print(response.json())


if __name__ == "__main__":
    asyncio.run(main())
