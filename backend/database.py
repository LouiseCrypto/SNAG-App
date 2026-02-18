from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use the Render persistent disk at /data if it exists, otherwise fall back
# to a local path next to this file (for development).
_HERE = os.path.dirname(os.path.abspath(__file__))
_DB_PATH = "/data/snag.db" if os.path.isdir("/data") else os.path.join(_HERE, "snag.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
