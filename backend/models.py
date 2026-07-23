from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    job_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="applied", nullable=False)
    notes = Column(Text, nullable=True)
    applied_date = Column(String, nullable=True)   # ISO date string: YYYY-MM-DD
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ── Interview ────────────────────────────────────────────────────────────────────

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=True)           # job role being practised
    company = Column(String, nullable=True)
    status = Column(String, default="active", nullable=False)  # active | completed | cancelled
    started_at = Column(DateTime, default=_now)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)       # total seconds
    overall_score = Column(Float, nullable=True)    # 0–10
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)


class InterviewMessage(Base):
    __tablename__ = "interview_messages"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, index=True)
    speaker = Column(String, nullable=False)        # "candidate" | "interviewer"
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)


class InterviewEvaluation(Base):
    __tablename__ = "interview_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, unique=True, index=True)

    # Dimension scores (0–10)
    communication = Column(Float, nullable=True)
    clarity = Column(Float, nullable=True)
    leadership = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    structure = Column(Float, nullable=True)
    problem_solving = Column(Float, nullable=True)
    star_method = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)

    # Qualitative feedback stored as JSON arrays
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    suggestions = Column(JSON, nullable=True)
    improved_answers = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=_now)

