import os
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context


config = context.config


def _load_db_url_from_dotenv() -> str | None:
    # Try to read Backend/.env or .env in CWD
    candidates = [
        Path(__file__).resolve().parent.parent / ".env",
        Path.cwd() / ".env",
    ]
    for p in candidates:
        try:
            text = p.read_text(encoding="utf-8")
        except FileNotFoundError:
            continue
        for line in text.splitlines():
            if line.strip().startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip("'\"")
    return None


def _normalize_url(url: str) -> str:
    # Accept legacy postgres:// and convert to postgresql://
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    # Prefer psycopg (sync) driver for Alembic
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("+asyncpg", "+psycopg")
    elif url.startswith("postgresql://") and "+" not in url.split(":", 1)[0]:
        # No explicit driver, force psycopg (psycopg3)
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


# Pull DB URL from environment; fallback to .env; normalize
db_url = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("SQLALCHEMY_DATABASE_URL")
    or os.environ.get("database_url")
    or _load_db_url_from_dotenv()
)
if db_url:
    config.set_main_option("sqlalchemy.url", _normalize_url(db_url))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# We rely on imperative migrations; no metadata required
target_metadata = None


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
