#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="$ROOT_DIR"

export TENANT_ADMIN_SCHEMA="${TENANT_ADMIN_SCHEMA:-tenant_admin}"

if [[ -z "${DATABASE_URL:-}" && -z "${SQLALCHEMY_DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL or SQLALCHEMY_DATABASE_URL is not set." >&2
  exit 1
fi

alembic -c "$ROOT_DIR/alembic.ini" upgrade head

