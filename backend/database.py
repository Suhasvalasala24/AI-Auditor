# backend/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# =========================================================
# DATABASE URL (Enterprise Safe)
# - Uses DATABASE_URL if present (Postgres)
# - Falls back to local SQLite for easy development
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'ai_auditor.db')}"
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_SQLITE_URL)

# SQLite special connect args
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# =========================================================
# DB DEPENDENCY
# =========================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# INITIALIZE DB (TABLE CREATION)
# =========================================================
def init_db():
    # Import models here to avoid circular import
    from .models import Base as ModelsBase  # ✅ this is SAME Base from models.py
    ModelsBase.metadata.create_all(bind=engine)
