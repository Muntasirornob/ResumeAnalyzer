from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ── Auth / User ───────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class UserCreate(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer.")
        return value


class UserResponse(BaseModel):
    username: str
    email: str | None = None


class UserInDB(UserResponse):
    hashed_password: str


# ── Resume ────────────────────────────────────────────────────────────────────

class ResumeUploadResponse(BaseModel):
    message: str = Field(..., examples=["Resume uploaded successfully"])
    filename: str
    raw_text: str
    cleaned_resume: str
    skills: list[str] = Field(default_factory=list)


class ATSAnalyzeRequest(BaseModel):
    cleaned_text: str = Field(..., min_length=1)


class ATSAnalyzeResponse(BaseModel):
    success: bool
    ats_score: int
    strengths: list[str]
    weaknesses: list[str]
    missing_keywords: list[str]


class ResumeRewriteRequest(BaseModel):
    job_role: str = Field(..., min_length=1)
    job_description: str = Field(..., min_length=1)
    cleaned_resume: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    ats_analysis: Optional[dict] = None


# ── Job Tracker ──────────────────────────────────────────────────────────────

class ApplicationStatus(str, Enum):
    applied = "applied"
    interviewing = "interviewing"
    offered = "offered"
    rejected = "rejected"
    withdrawn = "withdrawn"


class JobApplicationCreate(BaseModel):
    company: str = Field(..., min_length=1)
    job_title: str = Field(..., min_length=1)
    job_url: Optional[str] = None
    description: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.applied
    notes: Optional[str] = None
    applied_date: Optional[str] = None  # YYYY-MM-DD


class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    job_title: Optional[str] = None
    job_url: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None
    applied_date: Optional[str] = None


class JobApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    company: str
    job_title: str
    job_url: Optional[str] = None
    description: Optional[str] = None
    status: str
    notes: Optional[str] = None
    applied_date: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Interview ─────────────────────────────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    role: Optional[str] = Field(None, examples=["Software Engineer"])
    company: Optional[str] = Field(None, examples=["Google"])


class InterviewStartResponse(BaseModel):
    interview_id: int
    ephemeral_key: str


class InterviewMessageCreate(BaseModel):
    interview_id: int
    role: str = Field(..., pattern="^(candidate|interviewer)$")
    transcript: str = Field(..., min_length=1)


class InterviewMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    interview_id: int
    speaker: str
    text: str
    created_at: Optional[datetime] = None


class InterviewEndRequest(BaseModel):
    interview_id: int


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role: Optional[str] = None
    company: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    overall_score: Optional[float] = None
    feedback: Optional[str] = None
    created_at: Optional[datetime] = None


class InterviewEvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    interview_id: int
    communication: Optional[float] = None
    clarity: Optional[float] = None
    leadership: Optional[float] = None
    confidence: Optional[float] = None
    structure: Optional[float] = None
    problem_solving: Optional[float] = None
    star_method: Optional[float] = None
    overall_score: Optional[float] = None
    strengths: Optional[list] = None
    weaknesses: Optional[list] = None
    suggestions: Optional[list] = None
    improved_answers: Optional[list] = None
    created_at: Optional[datetime] = None
