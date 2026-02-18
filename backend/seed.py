"""Seed the database with the 8 engineers and sample data."""
from database import engine, SessionLocal
import models

models.Base.metadata.create_all(bind=engine)

ENGINEERS = [
    {"name": "Jamie",   "engineer_id": "ENG-001", "phone": "07700 900001", "avatar_color": "#F97316"},
    {"name": "Gary",    "engineer_id": "ENG-002", "phone": "07700 900002", "avatar_color": "#0EA5E9"},
    {"name": "Richard", "engineer_id": "ENG-003", "phone": "07700 900003", "avatar_color": "#8B5CF6"},
    {"name": "Kyle",    "engineer_id": "ENG-004", "phone": "07700 900004", "avatar_color": "#10B981"},
    {"name": "Scott",   "engineer_id": "ENG-005", "phone": "07700 900005", "avatar_color": "#EF4444"},
    {"name": "Paul",    "engineer_id": "ENG-006", "phone": "07700 900006", "avatar_color": "#F59E0B"},
    {"name": "Jak",     "engineer_id": "ENG-007", "phone": "07700 900007", "avatar_color": "#EC4899"},
    {"name": "Steve",   "engineer_id": "ENG-008", "phone": "07700 900008", "avatar_color": "#14B8A6"},
]

db = SessionLocal()

existing = db.query(models.Engineer).count()
if existing == 0:
    for e in ENGINEERS:
        engineer = models.Engineer(**e)
        db.add(engineer)
    db.commit()
    print(f"Seeded {len(ENGINEERS)} engineers.")
else:
    print(f"Database already has {existing} engineers. Skipping seed.")

db.close()
