from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
import logging
import threading
from datetime import datetime
import uuid

# ✅ Import your dependencies carefully to avoid circular imports
from .database import SessionLocal
from .models import AIModel, AuditRun
from .audit_engine import AuditEngine

logger = logging.getLogger("ai-auditor")

# Singleton Scheduler Instance
scheduler = AsyncIOScheduler()

def _run_audit_job(model_id_str: str):
    """
    Background Task: Triggered by the scheduler to run an audit.
    """
    db: Session = SessionLocal()
    try:
        logger.info(f"⏰ Scheduler waking up for Model: {model_id_str}")
        
        # 1. Fetch Model
        model = db.query(AIModel).filter(AIModel.model_id == model_id_str).first()
        if not model:
            logger.error(f"Scheduled audit failed: Model {model_id_str} not found in DB.")
            return

        # 2. Create Audit Record (Status: PENDING)
        audit_id = f"audit_sched_{uuid.uuid4().hex[:8]}"
        audit = AuditRun(
            audit_id=audit_id,
            model_id=model.id,
            audit_type="scheduled",
            executed_at=datetime.utcnow(),
            execution_status="RUNNING", # Start immediately
            audit_result="PENDING"
        )
        db.add(audit)
        db.commit()

        # 3. Run the Audit Engine (Synchronously inside this job)
        logger.info(f"🚀 Starting Scheduled Audit {audit_id}...")
        engine = AuditEngine(db)
        
        # We pass a dummy event since we aren't cancelling schedules manually here usually
        cancel_event = threading.Event()
        engine.run_active_audit(model, None, audit_id, cancel_event)
        
        logger.info(f"✅ Scheduled Audit {audit_id} COMPLETED.")

    except Exception as e:
        logger.exception(f"❌ Scheduled Audit CRASHED: {e}")
    finally:
        db.close()

def update_job_schedule(model_id: str, frequency: str):
    """
    Called by the API when a user changes the dropdown (Manual/Daily/Weekly).
    """
    job_id = f"audit_job_{model_id}"
    
    # 1. Clear existing job
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"♻️  Removed existing schedule for {model_id}")

    if frequency == "manual":
        logger.info(f"⏸️  Schedule set to MANUAL for {model_id}")
        return

    # 2. Set new trigger
    trigger = None
    if frequency == "daily":
        # Run every day at midnight (00:00)
        trigger = CronTrigger(hour=0, minute=0)
    elif frequency == "weekly":
        # Run every Sunday at midnight
        trigger = CronTrigger(day_of_week='sun', hour=0, minute=0)
    
    # 3. Add job
    if trigger:
        scheduler.add_job(
            _run_audit_job,
            trigger=trigger,
            args=[model_id],
            id=job_id,
            replace_existing=True
        )
        logger.info(f"📅 Scheduled {frequency.upper()} audit for {model_id}")