from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Engineer(Base):
    __tablename__ = "engineers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    engineer_id = Column(String, unique=True)
    phone = Column(String)
    role = Column(String, default="Engineer")
    avatar_color = Column(String, default="#F97316")
    is_on_shift = Column(Boolean, default=False)
    shift_start = Column(DateTime, nullable=True)

    ppm_jobs = relationship("PPMJob", back_populates="engineer")
    reactive_jobs = relationship("ReactiveJob", back_populates="engineer")
    handover_posts = relationship("HandoverPost", back_populates="engineer")
    overtime_logs = relationship("OvertimeLog", back_populates="engineer")


class PPMJob(Base):
    __tablename__ = "ppm_jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    location = Column(String)
    scheduled_date = Column(DateTime)
    status = Column(String, default="Pending")  # Pending, In Progress, Completed
    notes = Column(Text, nullable=True)
    photo_path = Column(String, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    engineer_id = Column(Integer, ForeignKey("engineers.id"), nullable=True)

    engineer = relationship("Engineer", back_populates="ppm_jobs")


class ReactiveJob(Base):
    __tablename__ = "reactive_jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    location = Column(String)
    priority = Column(String, default="Normal")  # Low, Normal, High, Critical
    status = Column(String, default="Pending")
    notes = Column(Text, nullable=True)
    photo_path = Column(String, nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    engineer_id = Column(Integer, ForeignKey("engineers.id"), nullable=True)
    ticked = Column(Boolean, default=False)

    engineer = relationship("Engineer", back_populates="reactive_jobs")


class HandoverPost(Base):
    __tablename__ = "handover_posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    engineer_id = Column(Integer, ForeignKey("engineers.id"))
    thumbs_up = Column(Integer, default=0)

    engineer = relationship("Engineer", back_populates="handover_posts")
    replies = relationship("HandoverReply", back_populates="post")
    reactions = relationship("HandoverReaction", back_populates="post")


class HandoverReply(Base):
    __tablename__ = "handover_replies"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    post_id = Column(Integer, ForeignKey("handover_posts.id"))
    engineer_id = Column(Integer, ForeignKey("engineers.id"))

    post = relationship("HandoverPost", back_populates="replies")
    engineer = relationship("Engineer")


class HandoverReaction(Base):
    __tablename__ = "handover_reactions"

    id = Column(Integer, primary_key=True, index=True)
    emoji = Column(String)
    post_id = Column(Integer, ForeignKey("handover_posts.id"))
    engineer_id = Column(Integer, ForeignKey("engineers.id"))

    post = relationship("HandoverPost", back_populates="reactions")
    engineer = relationship("Engineer")


class OvertimeLog(Base):
    __tablename__ = "overtime_logs"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime)
    hours = Column(Float)
    reason = Column(Text)
    approved = Column(Boolean, default=False)
    paid = Column(Boolean, default=False)
    engineer_id = Column(Integer, ForeignKey("engineers.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    engineer = relationship("Engineer", back_populates="overtime_logs")


class PartsOrder(Base):
    __tablename__ = "parts_orders"

    id = Column(Integer, primary_key=True, index=True)
    part_name = Column(String)
    part_number = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    supplier = Column(String, nullable=True)
    status = Column(String, default="Pending")
    ordered_by_id = Column(Integer, ForeignKey("engineers.id"))
    ordered_at = Column(DateTime, default=datetime.utcnow)
    received = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    ordered_by = relationship("Engineer")


class CalendarNote(Base):
    __tablename__ = "calendar_notes"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)  # stored as 'YYYY-MM-DD'
    note = Column(String)
    engineer_id = Column(Integer, ForeignKey("engineers.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    engineer = relationship("Engineer")


class ContractorIssue(Base):
    __tablename__ = "contractor_issues"

    id = Column(Integer, primary_key=True, index=True)
    contractor_name = Column(String)
    issue_description = Column(Text)
    severity = Column(String, default="Medium")
    status = Column(String, default="Open")
    reported_by_id = Column(Integer, ForeignKey("engineers.id"))
    reported_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    reported_by = relationship("Engineer")
