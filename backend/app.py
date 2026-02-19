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

# Log which database file is in use (visible in Render logs)
print(f"[SNAG] Database path: {database._DB_PATH}")

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
    """Insert any missing engineers by name (idempotent — safe to call on every startup)."""
    db = database.SessionLocal()
    try:
        inserted = 0
        for e in _ENGINEERS:
            if not db.query(models.Engineer).filter_by(name=e["name"]).first():
                db.add(models.Engineer(**e))
                inserted += 1
        if inserted:
            db.commit()
            print(f"Seeded {inserted} missing engineer(s).")
        else:
            print("All engineers already present — skipping seed.")
    except Exception as ex:
        print(f"Seed error: {ex}")
    finally:
        db.close()

_seed()

# ─── Safe column migrations (add new columns to existing DB) ─────────────────
def _migrate():
    from sqlalchemy import text
    with database.engine.connect() as conn:
        for sql in [
            "ALTER TABLE overtime_logs ADD COLUMN paid BOOLEAN DEFAULT 0",
            "ALTER TABLE ppm_jobs ADD COLUMN notes_edited_at DATETIME",
            "ALTER TABLE ppm_jobs ADD COLUMN on_hold_note TEXT",
            "ALTER TABLE ppm_jobs ADD COLUMN on_hold_at DATETIME",
            "ALTER TABLE reactive_jobs ADD COLUMN notes_edited_at DATETIME",
            "ALTER TABLE reactive_jobs ADD COLUMN on_hold_note TEXT",
            "ALTER TABLE reactive_jobs ADD COLUMN on_hold_at DATETIME",
            "ALTER TABLE handover_posts ADD COLUMN edited_at DATETIME",
            "ALTER TABLE handover_replies ADD COLUMN edited_at DATETIME",
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


class HandoverPostEdit(BaseModel):
    engineer_id: int
    content: str


class HandoverReplyEdit(BaseModel):
    engineer_id: int
    content: str


class OvertimeCreate(BaseModel):
    engineer_id: int
    date: str
    hours: float
    reason: str


class PPMJobCreate(BaseModel):
    title: str
    location: str
    scheduled_date: str
    engineer_id: Optional[int] = None


class ReactiveJobCreate(BaseModel):
    title: str
    location: str
    priority: str = "Normal"
    engineer_id: Optional[int] = None


class JobStartFinish(BaseModel):
    engineer_id: int
    notes: Optional[str] = None


class JobHoldCreate(BaseModel):
    engineer_id: int
    note: str


class JobNotesEdit(BaseModel):
    engineer_id: int
    notes: str


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
            "edited_at": post.edited_at,
            "engineer_id": post.engineer_id,
            "engineer_name": post.engineer.name,
            "engineer_color": post.engineer.avatar_color,
            "reactions": reactions_summary,
            "replies": [
                {
                    "id": r.id,
                    "content": r.content,
                    "created_at": r.created_at,
                    "edited_at": r.edited_at,
                    "engineer_id": r.engineer_id,
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


@app.patch("/handover/{post_id}/edit")
def edit_handover_post(post_id: int, data: HandoverPostEdit, db: Session = Depends(database.get_db)):
    post = db.query(models.HandoverPost).filter(models.HandoverPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.engineer_id != data.engineer_id:
        raise HTTPException(status_code=403, detail="Not authorised to edit this post")
    post.content = data.content
    post.edited_at = datetime.utcnow()
    db.commit()
    return {"message": "Post updated"}


@app.post("/handover/{post_id}/reply")
def reply_to_post(post_id: int, data: HandoverReplyCreate, db: Session = Depends(database.get_db)):
    reply = models.HandoverReply(
        content=data.content, post_id=post_id, engineer_id=data.engineer_id
    )
    db.add(reply)
    db.commit()
    return {"message": "Reply added"}


@app.patch("/handover/replies/{reply_id}/edit")
def edit_handover_reply(reply_id: int, data: HandoverReplyEdit, db: Session = Depends(database.get_db)):
    reply = db.query(models.HandoverReply).filter(models.HandoverReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    if reply.engineer_id != data.engineer_id:
        raise HTTPException(status_code=403, detail="Not authorised to edit this reply")
    reply.content = data.content
    reply.edited_at = datetime.utcnow()
    db.commit()
    return {"message": "Reply updated"}


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
def get_ppm_jobs(engineer_id: Optional[int] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.PPMJob).order_by(models.PPMJob.scheduled_date)
    if engineer_id is not None:
        query = query.filter(models.PPMJob.engineer_id == engineer_id)
    jobs = query.all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "scheduled_date": j.scheduled_date,
            "status": j.status,
            "notes": j.notes,
            "notes_edited_at": j.notes_edited_at,
            "on_hold_note": j.on_hold_note,
            "on_hold_at": j.on_hold_at,
            "photo_path": j.photo_path,
            "engineer_id": j.engineer_id,
            "engineer_name": j.engineer.name if j.engineer else None,
            "engineer_color": j.engineer.avatar_color if j.engineer else None,
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
        engineer_id=data.engineer_id,
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
    if data.notes:
        job.notes = data.notes
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


@app.post("/ppm/{job_id}/hold")
def hold_ppm_job(job_id: int, data: JobHoldCreate, db: Session = Depends(database.get_db)):
    job = db.query(models.PPMJob).filter(models.PPMJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "On Hold"
    job.on_hold_note = data.note
    job.on_hold_at = datetime.utcnow()
    db.commit()
    return {"message": "Job placed on hold"}


@app.post("/ppm/{job_id}/resume")
def resume_ppm_job(job_id: int, data: JobStartFinish, db: Session = Depends(database.get_db)):
    job = db.query(models.PPMJob).filter(models.PPMJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "In Progress"
    db.commit()
    return {"message": "Job resumed"}


@app.patch("/ppm/{job_id}/notes")
def edit_ppm_notes(job_id: int, data: JobNotesEdit, db: Session = Depends(database.get_db)):
    job = db.query(models.PPMJob).filter(models.PPMJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.engineer_id != data.engineer_id:
        raise HTTPException(status_code=403, detail="Not authorised to edit this job's notes")
    job.notes = data.notes
    job.notes_edited_at = datetime.utcnow()
    db.commit()
    return {"message": "Notes updated", "notes_edited_at": job.notes_edited_at}


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
def get_reactive_jobs(engineer_id: Optional[int] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.ReactiveJob).order_by(models.ReactiveJob.reported_at.desc())
    if engineer_id is not None:
        query = query.filter(models.ReactiveJob.engineer_id == engineer_id)
    jobs = query.all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "priority": j.priority,
            "status": j.status,
            "notes": j.notes,
            "notes_edited_at": j.notes_edited_at,
            "on_hold_note": j.on_hold_note,
            "on_hold_at": j.on_hold_at,
            "photo_path": j.photo_path,
            "reported_at": j.reported_at,
            "completed_at": j.completed_at,
            "engineer_id": j.engineer_id,
            "engineer_name": j.engineer.name if j.engineer else None,
            "engineer_color": j.engineer.avatar_color if j.engineer else None,
            "ticked": j.ticked,
        }
        for j in jobs
    ]


@app.post("/reactive")
def create_reactive_job(data: ReactiveJobCreate, db: Session = Depends(database.get_db)):
    job = models.ReactiveJob(title=data.title, location=data.location, priority=data.priority, engineer_id=data.engineer_id)
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
    if data.notes:
        job.notes = data.notes
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


@app.post("/reactive/{job_id}/hold")
def hold_reactive_job(job_id: int, data: JobHoldCreate, db: Session = Depends(database.get_db)):
    job = db.query(models.ReactiveJob).filter(models.ReactiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "On Hold"
    job.on_hold_note = data.note
    job.on_hold_at = datetime.utcnow()
    db.commit()
    return {"message": "Job placed on hold"}


@app.post("/reactive/{job_id}/resume")
def resume_reactive_job(job_id: int, data: JobStartFinish, db: Session = Depends(database.get_db)):
    job = db.query(models.ReactiveJob).filter(models.ReactiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "In Progress"
    db.commit()
    return {"message": "Job resumed"}


@app.patch("/reactive/{job_id}/notes")
def edit_reactive_notes(job_id: int, data: JobNotesEdit, db: Session = Depends(database.get_db)):
    job = db.query(models.ReactiveJob).filter(models.ReactiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.engineer_id != data.engineer_id:
        raise HTTPException(status_code=403, detail="Not authorised to edit this job's notes")
    job.notes = data.notes
    job.notes_edited_at = datetime.utcnow()
    db.commit()
    return {"message": "Notes updated", "notes_edited_at": job.notes_edited_at}


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
            "engineer_id": l.engineer_id,
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
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "status": j.status,
            "notes": j.notes,
            "notes_edited_at": j.notes_edited_at,
            "on_hold_note": j.on_hold_note,
            "on_hold_at": j.on_hold_at,
            "photo_path": j.photo_path,
            "scheduled_date": j.scheduled_date,
            "started_at": j.started_at,
            "completed_at": j.completed_at,
            "engineer_id": j.engineer_id,
            "engineer_name": j.engineer.name if j.engineer else None,
            "engineer_color": j.engineer.avatar_color if j.engineer else None,
        })
    for j in reactive_jobs:
        events.append({
            "date": j.reported_at.date().isoformat() if j.reported_at else None,
            "type": "reactive",
            "id": j.id,
            "title": j.title,
            "location": j.location,
            "priority": j.priority,
            "status": j.status,
            "notes": j.notes,
            "notes_edited_at": j.notes_edited_at,
            "on_hold_note": j.on_hold_note,
            "on_hold_at": j.on_hold_at,
            "photo_path": j.photo_path,
            "reported_at": j.reported_at,
            "started_at": j.started_at,
            "completed_at": j.completed_at,
            "engineer_id": j.engineer_id,
            "engineer_name": j.engineer.name if j.engineer else None,
            "engineer_color": j.engineer.avatar_color if j.engineer else None,
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


# ─── Admin / Diagnostics ─────────────────────────────────────────────────────

@app.get("/admin/db-info")
def db_info(db: Session = Depends(database.get_db)):
    """Return the live database path and engineer count — useful for diagnosing Render disk issues."""
    engineer_count = db.query(models.Engineer).count()
    return {
        "db_url": str(database.SQLALCHEMY_DATABASE_URL),
        "db_path": database._DB_PATH,
        "engineer_count": engineer_count,
        "engineers": [e.name for e in db.query(models.Engineer).all()],
    }


@app.post("/admin/reseed")
def admin_reseed(db: Session = Depends(database.get_db)):
    """Force-insert any missing engineers. Safe to call at any time — will not duplicate."""
    inserted = []
    for e in _ENGINEERS:
        if not db.query(models.Engineer).filter_by(name=e["name"]).first():
            db.add(models.Engineer(**e))
            inserted.append(e["name"])
    if inserted:
        db.commit()
    return {
        "inserted": inserted,
        "message": f"Inserted {len(inserted)} engineer(s)." if inserted else "All engineers already present.",
    }
