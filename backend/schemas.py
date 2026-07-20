from typing import Optional

from pydantic import BaseModel, Field


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
