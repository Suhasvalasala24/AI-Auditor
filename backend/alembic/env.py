from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# =========================================================
# ✅ Fix PYTHONPATH so "backend" becomes importable
# Alembic runs from inside backend/, but env.py imports backend.*
# This ensures absolute imports work consistently.
# =========================================================

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))          # /backend
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))                      # /AI-Auditor

# Ensure project root is on sys.path
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# =========================================================
# Alembic Config
# =========================================================

config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# =========================================================
# Import models so Alembic sees metadata
# =========================================================

from backend import models  # noqa: F401
from backend.database import Base

target_metadata = Base.metadata


# =========================================================
# Migration Functions
# =========================================================

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}) or {},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
