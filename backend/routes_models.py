# backend/routes_models.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import AIModel, EvidenceSource

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("")
def list_models(db: Session = Depends(get_db)):
    models = db.query(AIModel).order_by(AIModel.created_at.desc()).all()
    return {
        "status": "OK",
        "models": [
            {
                "model_id": m.model_id,
                "name": m.name,
                "version": m.version,
                "model_type": m.model_type,
                "connection_type": m.connection_type,
                "description": m.description,
                "is_active": m.is_active,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in models
        ],
    }


@router.post("/register-with-connector")
def register_model(payload: dict, db: Session = Depends(get_db)):

    required = ["model_id", "name", "provider", "model"]
    for r in required:
        if r not in payload:
            raise HTTPException(400, f"Missing field: {r}")

    # ✅ Prevent duplicate model_id
    exists = db.query(AIModel).filter(AIModel.model_id == payload["model_id"]).first()
    if exists:
        raise HTTPException(
            status_code=409,
            detail=f"Model already exists with model_id={payload['model_id']}",
        )

    # 1️⃣ Create logical model
    model = AIModel(
        model_id=payload["model_id"],
        name=payload["name"],
        version=payload.get("model", "1.0"),
        model_type="llm",
        connection_type="api",
        description=payload.get("description"),
        is_active=True,
    )
    db.add(model)
    db.flush()  # model.id available

    # 2️⃣ Create evidence connector
    evidence = EvidenceSource(
        model_id=model.id,
        source_type="api",
        config={
            "provider": payload["provider"],
            "model": payload["model"],
            "api_key": payload.get("api_key"),
            "base_url": payload.get("base_url"),
        },
        read_only=True,
    )
    db.add(evidence)

    db.commit()

    return {
        "status": "registered",
        "model_id": model.model_id,
        "name": model.name,
    }
