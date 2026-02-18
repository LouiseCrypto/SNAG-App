from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
import os
import shutil
import models
import database
from pydantic import BaseModel

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

# ─── Auto-seed engineers on every cold start ─────────────────────────────────
_ENGINEERS = [
    {"name": "Jamie",   "engineer_id": "ENG-001", "phone": "07700 900001", "avatar_color": "#F97316"},
    {"name": "Gary",    "engineer_id": "ENG-002", "phone": "07700 900002", "avatar_color": "#0EA5E9"},
    {"name": "Richard", "engineer_id": "ENG-003", "phone": "07700 900003", "avatar_color": "#8B5CF6"},
    {"name": "Kyle",    "engineer_id": "ENG-004", "phone": "07700 900004", "avatar_color": "#10B981"},
    {"name": "Scott",   "engineer_id": "ENG-005", "phone": "07700 900005", "avatar_color": "#EF4444"},
    {"name": "Paul",    "engineer_id": "ENG-006", "phone": "07700 900006", "avatar_color": "#F59E0B"},
    {"name": "Jak",     "engineer_id": "ENG-007", "phone": "07700 900007", "avatar_color": "#EC4899"},
    {"name": "Steve",   "engineer_id": "ENG-008", "phone": "07700 900008", "avatar_color": "#14B8A6"},
]

def _seed():
    db = database.SessionLocal()
    try:
        if db.query(models.Engineer).count() == 0:
            for e in _ENGINEERS:
                db.add(models.Engineer(**e))
            db.commit()
            print(f"Seeded {len(_ENGINEERS)} engineers.")
    finally:
        db.close()

_seed()

# ─── Safe column migrations (add new columns to existing DB) ─────────────────
def _migrate():
    from sqlalchemy import text
    with database.engine.connect() as conn:
        for sql in [
            "ALTER TABLE overtime_logs ADD COLUMN paid BOOLEAN DEFAULT 0",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists — safe to ignore

_migrate()
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="SNAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # covers localhost, Render, and any future frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class EngineerOut(BaseModel):
    id: int
    name: str
    engineer_id: str
    phone: str
    avatar_color: str
    is_on_shift: bool
    shift_start: Optional[datetime]

    class Config:
        from_attributes = True


class ShiftToggle(BaseModel):
    engineer_id: int


class HandoverPostCreate(BaseModel):
    content: str
    engineer_id: int


class HandoverReplyCreate(BaseModel):
    content: str
    engineer_id: int


class ReactionCreate(BaseModel):
    emoji: str
    engineer_id: int


class OvertimeCreate(BaseModel):
    engineer_id: int
    date: str
    hours: float
    reason: str


class PPMJobCreate(BaseModel):
    title: str
    location: str
    scheduled_date: str


class ReactiveJobCreate(BaseModel):
    title: str
    location: str
    priority: str = "Normal"


class JobStartFinish(BaseModel):
    engineer_id: int
    notes: Optional[str] = None


class PartsOrderCreate(BaseModel):
    part_name: str
    part_number: Optional[str] = None
    quantity: int = 1
    supplier: Optional[str] = None
    notes: Optional[str] = None
    ordered_by_id: int


class ContractorIssueCreate(BaseModel):
    contractor_name: str
    issue_description: str
    severity: str = "Medium"
    notes: Optional[str] = None
    reported_by_id: int


# ─── Engineers ───────────────────────────────────────────────────────────────

@app.get("/engineers", response_model=List[EngineerOut])
def get_engineers(db: Session = Depends(database.get_db)):
    return db.query(models.Engineer).all()


@app.get("/engineers/{engineer_id}", response_model=EngineerOut)
def get_engineer(engineer_id: int, db: Session = Depends(database.get_db)):
    eng = db.query(models.Engineer).filter(models.Engineer.id == engineer_id).first()
    if not eng:
        raise HTTPException(status_code=404, detail="Engineer not found")
    return eng


@app.post("/engineers/shift-toggle")
def toggle_shift(data: ShiftToggle, db: Session = Depends(database.get_db)):
    eng = db.query(models.Engineer).filter(models.Engineer.id == data.engineer_id).first()
    if not eng:
        raise HTTPException(status_code=404, detail="Engineer not found")
    eng.is_on_shift = not eng.is_on_shift
    eng.shift_start = datetime.utcnow() if eng.is_on_shift else None
    db.commit()
    db.refresh(eng)
    return {"is_on_shift": eng.is_on_shift, "shift_start": eng.shift_start}


# ─── Handover Feed ───────────────────────────────────────────────────────────

@app.get("/handover")
def get_handover(db: Session = Depends(database.get_db)):
    posts = (
        db.query(models.HandoverPost)
        .order_by(models.HandoverPost.created_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for post in posts:
        reactions_summary = {}
        for r in post.reactions:
            reactions_summary[r.emoji] = reactions_summary.get(r.emoji, 0) + 1
        result.append({
            "id": post.id,
            "content": post.content,
            "created_at": post.created_at,
            "engineer_name": post.engineer.name,
            "engineer_color": post.engineer.avatar_color,
            "reactions": reactions_summary,
            "replies": [
                {
                    "id": r.id,
                    "content": r.content,
                    "created_at": r.created_at,
                    "engineer_name": r.engineer.name,
                    "engineer_color": r.engineer.avatar_color,
                }
                for r in post.replies
            ],
        })
    return result


@app.post("/handover")
def create_handover_post(data: HandoverPostCreate, db: Session = Depends(database.get_db)):
    post = models.HandoverPost(content=data.content, engineer_id=data.engineer_id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"id": post.id, "message": "Post created"}


@app.post("/handover/{post_id}/reply")
def reply_to_post(post_id: int, data: HandoverReplyCreate, db: Session = Depends(database.get_db)):
    reply = models.HandoverReply(
        content=data.content, post_id=post_id, engineer_id=data.engineer_id
    )
    db.add(reply)
    db.commit()
    return {"message": "Reply added"}


@app.post("/handover/{post_id}/react")
def react_to_post(post_id: int, data: ReactionCreate, db: Session = Depends(database.get_db)):
    existing = (
        db.query(models.HandoverReaction)
        .filter_by(post_id=post_id, engineer_id=data.engineer_id, emoji=data.emoji)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Reaction removed"}
    reaction = models.HandoverReaction(
        emoji=data.emoji, post_id=post_id, engineer_id=data.engineer_id
    )
    db.add(reaction)
    db.commit()
    return {"message": "Reaction added"}


# ─── PPM Jobs ────────────────────────────────────────────────────────────────

@app.get("/ppm")
def get_ppm_jobs(db: Session = Depends(database.get_db)):
    jobs = db.query(models.PPMJob).order_by(models.PPMJob.scheduled_date).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "scheduled_date": j.scheduled_date,
            "status": j.status,
            "notes": j.notes,
            "photo_path": j.photo_path,
            "engineer_name": j.engineer.name if j.engineer else None,
            "completed_at": j.completed_at,
        }
        for j in jobs
    ]


@app.post("/ppm")
def create_ppm_job(data: PPMJobCreate, db: Session = Depends(database.get_db)):
    job = models.PPMJob(
        title=data.title,
        location=data.location,
        scheduled_date=datetime.fromisoformat(data.scheduled_date),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id}


@app.post("/ppm/{job_id}/start")
def start_ppm_job(job_id: int, data: JobStartFinish, db: Session = Depends(database.get_db)):
    job = db.query(models.PPMJob).filter(models.PPMJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "In Progress"
    job.started_at = datetime.utcnow()
    job.engineer_id = data.engineer_id
    db.commit()
    return {"message": "Job started"}


@app.post("/ppm/{job_id}/finish")
def finish_ppm_job(job_id: int, data: JobStartFinish, db: Session = Depends(database.get_db)):
    job = db.query(models.PPMJob).filter(models.PPMJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "Completed"
    job.completed_at = datetime.utcnow()
    if data.notes:
        job.notes = data.notes
    db.commit()
    return {"message": "Job completed"}


@app.post("/ppm/{job_id}/photo")
async def upload_ppm_photo(job_id: int, file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    job = db.query(models.PPMJob).filter(models.PPMJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    ext = file.filename.split(".")[-1]
    filename = f"ppm_{job_id}_{int(datetime.utcnow().timestamp())}.{ext}"
    path = f"uploads/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    job.photo_path = f"/uploads/{filename}"
    db.commit()
    return {"photo_path": job.photo_path}


# ─── Reactive Jobs ───────────────────────────────────────────────────────────

@app.get("/reactive")
def get_reactive_jobs(db: Session = Depends(database.get_db)):
    jobs = db.query(models.ReactiveJob).order_by(models.ReactiveJob.reported_at.desc()).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "priority": j.priority,
            "status": j.status,
            "notes": j.notes,
            "photo_path": j.photo_path,
            "reported_at": j.reported_at,
            "completed_at": j.completed_at,
            "engineer_name": j.engineer.name if j.engineer else None,
            "ticked": j.ticked,
        }
        for j in jobs
    ]


@app.post("/reactive")
def create_reactive_job(data: ReactiveJobCreate, db: Session = Depends(database.get_db)):
    job = models.ReactiveJob(title=data.title, location=data.location, priority=data.priority)
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id}


@app.post("/reactive/{job_id}/start")
def start_reactive_job(job_id: int, data: JobStartFinish, db: Session = Depends(database.get_db)):
    job = db.query(models.ReactiveJob).filter(models.ReactiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "In Progress"
    job.started_at = datetime.utcnow()
    job.engineer_id = data.engineer_id
    db.commit()
    return {"message": "Job started"}


@app.post("/reactive/{job_id}/finish")
def finish_reactive_job(job_id: int, data: JobStartFinish, db: Session = Depends(database.get_db)):
    job = db.query(models.ReactiveJob).filter(models.ReactiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "Completed"
    job.completed_at = datetime.utcnow()
    job.ticked = True
    if data.notes:
        job.notes = data.notes
    db.commit()
    return {"message": "Job completed"}


@app.post("/reactive/{job_id}/photo")
async def upload_reactive_photo(job_id: int, file: UploadFile = File(...), db: Session = Depends(database.get_db)):
    job = db.query(models.ReactiveJob).filter(models.ReactiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    ext = file.filename.split(".")[-1]
    filename = f"reactive_{job_id}_{int(datetime.utcnow().timestamp())}.{ext}"
    path = f"uploads/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    job.photo_path = f"/uploads/{filename}"
    db.commit()
    return {"photo_path": job.photo_path}


# ─── Overtime ────────────────────────────────────────────────────────────────

@app.get("/overtime")
def get_overtime(db: Session = Depends(database.get_db)):
    logs = db.query(models.OvertimeLog).order_by(models.OvertimeLog.date.desc()).all()
    return [
        {
            "id": l.id,
            "date": l.date,
            "hours": l.hours,
            "reason": l.reason,
            "approved": l.approved,
            "paid": bool(l.paid),
            "engineer_name": l.engineer.name,
            "engineer_color": l.engineer.avatar_color,
        }
        for l in logs
    ]


@app.patch("/overtime/{log_id}/paid")
def toggle_paid(log_id: int, db: Session = Depends(database.get_db)):
    log = db.query(models.OvertimeLog).filter(models.OvertimeLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    log.paid = not log.paid
    db.commit()
    return {"paid": log.paid}


@app.post("/overtime")
def log_overtime(data: OvertimeCreate, db: Session = Depends(database.get_db)):
    log = models.OvertimeLog(
        engineer_id=data.engineer_id,
        date=datetime.fromisoformat(data.date),
        hours=data.hours,
        reason=data.reason,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"id": log.id, "message": "Overtime logged"}


# ─── Calendar ────────────────────────────────────────────────────────────────

@app.get("/calendar")
def get_calendar_data(db: Session = Depends(database.get_db)):
    ppm_jobs = db.query(models.PPMJob).all()
    reactive_jobs = db.query(models.ReactiveJob).all()
    events = []
    for j in ppm_jobs:
        events.append({
            "date": j.scheduled_date.date().isoformat() if j.scheduled_date else None,
            "type": "ppm",
            "title": j.title,
            "status": j.status,
            "id": j.id,
        })
    for j in reactive_jobs:
        events.append({
            "date": j.reported_at.date().isoformat() if j.reported_at else None,
            "type": "reactive",
            "title": j.title,
            "status": j.status,
            "id": j.id,
        })
    return events


# ─── Parts Orders ────────────────────────────────────────────────────────────

@app.get("/parts")
def get_parts(db: Session = Depends(database.get_db)):
    return db.query(models.PartsOrder).order_by(models.PartsOrder.ordered_at.desc()).all()


@app.post("/parts")
def create_parts_order(data: PartsOrderCreate, db: Session = Depends(database.get_db)):
    order = models.PartsOrder(**data.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return {"id": order.id}


@app.patch("/parts/{order_id}/receive")
def receive_part(order_id: int, db: Session = Depends(database.get_db)):
    order = db.query(models.PartsOrder).filter(models.PartsOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.received = not order.received
    order.status = "Received" if order.received else "Pending"
    db.commit()
    return {"received": order.received}


# ─── Contractor Issues ───────────────────────────────────────────────────────

@app.get("/contractors")
def get_contractors(db: Session = Depends(database.get_db)):
    return db.query(models.ContractorIssue).order_by(models.ContractorIssue.reported_at.desc()).all()


@app.post("/contractors")
def create_contractor_issue(data: ContractorIssueCreate, db: Session = Depends(database.get_db)):
    issue = models.ContractorIssue(**data.model_dump())
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return {"id": issue.id}


@app.patch("/contractors/{issue_id}/resolve")
def resolve_issue(issue_id: int, db: Session = Depends(database.get_db)):
    issue = db.query(models.ContractorIssue).filter(models.ContractorIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.resolved = not issue.resolved
    issue.status = "Resolved" if issue.resolved else "Open"
    db.commit()
    return {"resolved": issue.resolved}


# ─── Calendar Notes ──────────────────────────────────────────────────────────

class CalendarNoteCreate(BaseModel):
    date: str
    note: str
    engineer_id: int


@app.get("/calendar-notes")
def get_calendar_notes(db: Session = Depends(database.get_db)):
    notes = db.query(models.CalendarNote).all()
    return [
        {
            "id": n.id,
            "date": n.date,
            "note": n.note,
            "engineer_name": n.engineer.name,
            "engineer_color": n.engineer.avatar_color,
        }
        for n in notes
    ]


@app.post("/calendar-notes")
def create_calendar_note(data: CalendarNoteCreate, db: Session = Depends(database.get_db)):
    note = models.CalendarNote(date=data.date, note=data.note, engineer_id=data.engineer_id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id}


@app.delete("/calendar-notes/{note_id}")
def delete_calendar_note(note_id: int, db: Session = Depends(database.get_db)):
    note = db.query(models.CalendarNote).filter(models.CalendarNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Deleted"}


@app.get("/health")
def health():
    return {"status": "ok"}
